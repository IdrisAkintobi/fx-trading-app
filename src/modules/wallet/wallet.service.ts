import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Currency,
  TransactionStatus,
  TransactionType,
} from '../../common/constants/enums';
import { RedisService } from '../redis/redis.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WalletBalance } from './entities/wallet-balance.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async getBalances(userId: string): Promise<WalletBalance[]> {
    return this.walletBalanceRepository.find({
      where: { userId },
      order: { currency: 'ASC' },
    });
  }

  async getBalance(userId: string, currency: Currency): Promise<WalletBalance> {
    let balance = await this.walletBalanceRepository.findOne({
      where: { userId, currency },
    });

    if (!balance) {
      // Create wallet balance if it doesn't exist
      balance = this.walletBalanceRepository.create({
        userId,
        currency,
        balance: '0',
      });
      await this.walletBalanceRepository.save(balance);
    }

    return balance;
  }

  async fundWallet(
    userId: string,
    fundWalletDto: FundWalletDto,
  ): Promise<Transaction> {
    const { currency, amount, idempotencyKey } = fundWalletDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findOne({
        where: { userId, idempotencyKey },
      });

      if (existingTransaction) {
        return existingTransaction;
      }
    }

    // Acquire distributed lock for this wallet
    const lockKey = `lock:wallet:${userId}:${currency}`;
    const acquired = await this.redisService.acquireLock(lockKey, 10);

    if (!acquired) {
      throw new ConflictException(
        'Wallet operation in progress. Please try again.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get wallet balance with pessimistic lock
      const balance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.userId = :userId', { userId })
        .andWhere('wb.currency = :currency', { currency })
        .getOne();

      let walletBalance: WalletBalance;

      if (balance) {
        // Update existing balance
        const newBalance = parseFloat(balance.balance) + amount;
        balance.balance = newBalance.toString();
        await queryRunner.manager.save(balance);
        walletBalance = balance;
      } else {
        // Create new wallet balance
        walletBalance = queryRunner.manager.create(WalletBalance, {
          userId,
          currency,
          balance: amount.toString(),
        });
        await queryRunner.manager.save(walletBalance);
      }

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        userId,
        type: TransactionType.FUND,
        fromCurrency: null,
        toCurrency: currency,
        fromAmount: null,
        toAmount: amount.toString(),
        rate: null,
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: JSON.stringify({ balance: walletBalance.balance }),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
      await this.redisService.releaseLock(lockKey);
    }
  }

  async convertCurrency(
    userId: string,
    convertDto: ConvertCurrencyDto,
    rate: number,
  ): Promise<Transaction> {
    const { fromCurrency, toCurrency, amount, idempotencyKey } = convertDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (rate <= 0) {
      throw new BadRequestException('Exchange rate must be greater than zero');
    }

    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Cannot convert to the same currency');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findOne({
        where: { userId, idempotencyKey },
      });

      if (existingTransaction) {
        return existingTransaction;
      }
    }

    // Acquire locks for both currencies (in alphabetical order to prevent deadlock)
    const currencies = [fromCurrency, toCurrency].sort((a, b) =>
      a.localeCompare(b),
    );
    const lockKey1 = `lock:wallet:${userId}:${currencies[0]}`;
    const lockKey2 = `lock:wallet:${userId}:${currencies[1]}`;

    const acquired1 = await this.redisService.acquireLock(lockKey1, 10);
    if (!acquired1) {
      throw new ConflictException(
        'Wallet operation in progress. Please try again.',
      );
    }

    const acquired2 = await this.redisService.acquireLock(lockKey2, 10);
    if (!acquired2) {
      await this.redisService.releaseLock(lockKey1);
      throw new ConflictException(
        'Wallet operation in progress. Please try again.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get source balance with pessimistic lock
      const sourceBalance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.userId = :userId', { userId })
        .andWhere('wb.currency = :currency', { currency: fromCurrency })
        .getOne();

      if (!sourceBalance) {
        throw new NotFoundException(`No ${fromCurrency} balance found`);
      }

      const currentBalance = parseFloat(sourceBalance.balance);
      if (currentBalance < amount) {
        throw new BadRequestException(
          `Insufficient ${fromCurrency} balance. Available: ${currentBalance}, Required: ${amount}`,
        );
      }

      // Calculate converted amount
      const convertedAmount = amount * rate;

      // Deduct from source currency
      sourceBalance.balance = (currentBalance - amount).toString();
      await queryRunner.manager.save(sourceBalance);

      // Get or create target balance with pessimistic lock
      let targetBalance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.userId = :userId', { userId })
        .andWhere('wb.currency = :currency', { currency: toCurrency })
        .getOne();

      if (targetBalance) {
        const targetCurrentBalance = parseFloat(targetBalance.balance);
        targetBalance.balance = (
          targetCurrentBalance + convertedAmount
        ).toString();
      } else {
        targetBalance = queryRunner.manager.create(WalletBalance, {
          userId,
          currency: toCurrency,
          balance: convertedAmount.toString(),
        });
      }

      await queryRunner.manager.save(targetBalance);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        userId,
        type: TransactionType.CONVERT,
        fromCurrency,
        toCurrency,
        fromAmount: amount.toString(),
        toAmount: convertedAmount.toString(),
        rate: rate.toString(),
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: JSON.stringify({
          sourceBalance: sourceBalance.balance,
          targetBalance: targetBalance.balance,
        }),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
      await this.redisService.releaseLock(lockKey1);
      await this.redisService.releaseLock(lockKey2);
    }
  }

  async tradeCurrency(
    userId: string,
    convertDto: ConvertCurrencyDto,
    rate: number,
  ): Promise<Transaction> {
    // Trade is essentially the same as convert, but we mark it differently
    const { fromCurrency, toCurrency, amount, idempotencyKey } = convertDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    if (rate <= 0) {
      throw new BadRequestException('Exchange rate must be greater than zero');
    }

    if (fromCurrency === toCurrency) {
      throw new BadRequestException('Cannot trade to the same currency');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findOne({
        where: { userId, idempotencyKey },
      });

      if (existingTransaction) {
        return existingTransaction;
      }
    }

    // Acquire locks for both currencies (in alphabetical order to prevent deadlock)
    const currencies = [fromCurrency, toCurrency].sort((a, b) =>
      a.localeCompare(b),
    );
    const lockKey1 = `lock:wallet:${userId}:${currencies[0]}`;
    const lockKey2 = `lock:wallet:${userId}:${currencies[1]}`;

    const acquired1 = await this.redisService.acquireLock(lockKey1, 10);
    if (!acquired1) {
      throw new ConflictException(
        'Wallet operation in progress. Please try again.',
      );
    }

    const acquired2 = await this.redisService.acquireLock(lockKey2, 10);
    if (!acquired2) {
      await this.redisService.releaseLock(lockKey1);
      throw new ConflictException(
        'Wallet operation in progress. Please try again.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get source balance with pessimistic lock
      const sourceBalance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.userId = :userId', { userId })
        .andWhere('wb.currency = :currency', { currency: fromCurrency })
        .getOne();

      if (!sourceBalance) {
        throw new NotFoundException(`No ${fromCurrency} balance found`);
      }

      const currentBalance = parseFloat(sourceBalance.balance);
      if (currentBalance < amount) {
        throw new BadRequestException(
          `Insufficient ${fromCurrency} balance. Available: ${currentBalance}, Required: ${amount}`,
        );
      }

      // Calculate traded amount
      const tradedAmount = amount * rate;

      // Deduct from source currency
      sourceBalance.balance = (currentBalance - amount).toString();
      await queryRunner.manager.save(sourceBalance);

      // Get or create target balance with pessimistic lock
      let targetBalance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.userId = :userId', { userId })
        .andWhere('wb.currency = :currency', { currency: toCurrency })
        .getOne();

      if (targetBalance) {
        const targetCurrentBalance = parseFloat(targetBalance.balance);
        targetBalance.balance = (
          targetCurrentBalance + tradedAmount
        ).toString();
      } else {
        targetBalance = queryRunner.manager.create(WalletBalance, {
          userId,
          currency: toCurrency,
          balance: tradedAmount.toString(),
        });
      }

      await queryRunner.manager.save(targetBalance);

      // Create transaction record with TRADE type
      const transaction = queryRunner.manager.create(Transaction, {
        userId,
        type: TransactionType.TRADE,
        fromCurrency,
        toCurrency,
        fromAmount: amount.toString(),
        toAmount: tradedAmount.toString(),
        rate: rate.toString(),
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: JSON.stringify({
          sourceBalance: sourceBalance.balance,
          targetBalance: targetBalance.balance,
        }),
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
      await this.redisService.releaseLock(lockKey1);
      await this.redisService.releaseLock(lockKey2);
    }
  }
}
