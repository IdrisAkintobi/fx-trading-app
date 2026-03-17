import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  Currency,
  TransactionStatus,
  TransactionType,
} from '../../../../src/common/constants/enums';
import { RedisService } from '../../../../src/modules/redis/redis.service';
import { Transaction } from '../../../../src/modules/transactions/entities/transaction.entity';
import { WalletBalance } from '../../../../src/modules/wallet/entities/wallet-balance.entity';
import { WalletService } from '../../../../src/modules/wallet/wallet.service';
import {
  mockWalletBalance,
  mockWalletBalanceEUR,
  mockWalletBalances,
} from '../mocks/data.mock';
import {
  createMockQueryRunner,
  mockDataSource,
  mockRedisService,
  mockTransactionRepository,
  mockWalletBalanceRepository,
} from '../mocks/repository.mock';

describe('WalletService', () => {
  let service: WalletService;
  let queryRunner: ReturnType<typeof createMockQueryRunner>;

  beforeEach(async () => {
    queryRunner = createMockQueryRunner();
    mockDataSource.createQueryRunner.mockReturnValue(queryRunner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletBalance),
          useValue: mockWalletBalanceRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalances', () => {
    it('should return all wallet balances for a user', async () => {
      mockWalletBalanceRepository.find.mockResolvedValue(mockWalletBalances);

      const result = await service.getBalances('user-123');

      expect(result).toEqual(mockWalletBalances);
      expect(mockWalletBalanceRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { currency: 'ASC' },
      });
    });
  });

  describe('getBalance', () => {
    it('should return existing wallet balance', async () => {
      mockWalletBalanceRepository.findOne.mockResolvedValue(mockWalletBalance);

      const result = await service.getBalance('user-123', Currency.USD);

      expect(result).toEqual(mockWalletBalance);
      expect(mockWalletBalanceRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123', currency: Currency.USD },
      });
    });

    it('should create new wallet balance if not exists', async () => {
      const newBalance = {
        userId: 'user-123',
        currency: Currency.GBP,
        balance: '0',
      };

      mockWalletBalanceRepository.findOne.mockResolvedValue(null);
      mockWalletBalanceRepository.create.mockReturnValue(newBalance);
      mockWalletBalanceRepository.save.mockResolvedValue(newBalance);

      const result = await service.getBalance('user-123', Currency.GBP);

      expect(mockWalletBalanceRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        currency: Currency.GBP,
        balance: '0',
      });
      expect(mockWalletBalanceRepository.save).toHaveBeenCalled();
      expect(result).toEqual(newBalance);
    });
  });

  describe('fundWallet', () => {
    it('should fund wallet successfully', async () => {
      const fundDto = {
        currency: Currency.USD,
        amount: 100,
        idempotencyKey: 'fund-123',
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(true);
      queryRunner.queryBuilder.getOne.mockResolvedValue({
        ...mockWalletBalance,
        balance: '1000.00',
      });
      queryRunner.manager.save.mockResolvedValue({
        ...mockWalletBalance,
        balance: '1100.00',
      });
      queryRunner.manager.create.mockReturnValue({
        userId: 'user-123',
        type: TransactionType.FUND,
        toCurrency: Currency.USD,
        toAmount: '100',
        status: TransactionStatus.COMPLETED,
      });
      queryRunner.manager.save.mockResolvedValueOnce({
        ...mockWalletBalance,
        balance: '1100.00',
      });
      queryRunner.manager.save.mockResolvedValueOnce({
        id: 'txn-123',
        userId: 'user-123',
        type: TransactionType.FUND,
        toCurrency: Currency.USD,
        toAmount: '100',
        status: TransactionStatus.COMPLETED,
      });

      const result = await service.fundWallet('user-123', fundDto);

      expect(mockRedisService.acquireLock).toHaveBeenCalledWith(
        'lock:wallet:user-123:USD',
        10,
      );
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(mockRedisService.releaseLock).toHaveBeenCalledWith(
        'lock:wallet:user-123:USD',
      );
      expect(result).toBeDefined();
    });

    it('should return existing transaction if idempotency key exists', async () => {
      const fundDto = {
        currency: Currency.USD,
        amount: 100,
        idempotencyKey: 'fund-123',
      };
      const existingTransaction = {
        id: 'txn-existing',
        userId: 'user-123',
        idempotencyKey: 'fund-123',
      };

      mockTransactionRepository.findOne.mockResolvedValue(existingTransaction);

      const result = await service.fundWallet('user-123', fundDto);

      expect(result).toEqual(existingTransaction);
      expect(mockRedisService.acquireLock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      const fundDto = {
        currency: Currency.USD,
        amount: -100,
        idempotencyKey: 'fund-123',
      };

      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow(
        'Amount must be greater than zero',
      );
    });

    it('should throw ConflictException if lock cannot be acquired', async () => {
      const fundDto = {
        currency: Currency.USD,
        amount: 100,
        idempotencyKey: 'fund-123',
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(false);

      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow(
        'Wallet operation in progress. Please try again.',
      );
    });

    it('should rollback transaction on error', async () => {
      const fundDto = {
        currency: Currency.USD,
        amount: 100,
        idempotencyKey: 'fund-123',
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(true);
      queryRunner.queryBuilder.getOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.fundWallet('user-123', fundDto)).rejects.toThrow();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(mockRedisService.releaseLock).toHaveBeenCalled();
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency successfully', async () => {
      const convertDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.EUR,
        amount: 100,
        idempotencyKey: 'convert-123',
      };
      const rate = 0.85;

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(true);
      queryRunner.queryBuilder.getOne
        .mockResolvedValueOnce({
          ...mockWalletBalance,
          balance: '1000.00',
        })
        .mockResolvedValueOnce({
          ...mockWalletBalanceEUR,
          balance: '500.00',
        });
      queryRunner.manager.save.mockResolvedValue({});
      queryRunner.manager.create.mockReturnValue({});
      queryRunner.manager.save.mockResolvedValueOnce({});
      queryRunner.manager.save.mockResolvedValueOnce({});
      queryRunner.manager.save.mockResolvedValueOnce({
        id: 'txn-convert',
        type: TransactionType.CONVERT,
      });

      const result = await service.convertCurrency(
        'user-123',
        convertDto,
        rate,
      );

      expect(mockRedisService.acquireLock).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRedisService.releaseLock).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for same currency conversion', async () => {
      const convertDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.USD,
        amount: 100,
        idempotencyKey: 'convert-123',
      };
      const rate = 1;

      await expect(
        service.convertCurrency('user-123', convertDto, rate),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.convertCurrency('user-123', convertDto, rate),
      ).rejects.toThrow('Cannot convert to the same currency');
    });

    it('should throw NotFoundException if source balance not found', async () => {
      const convertDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.EUR,
        amount: 100,
        idempotencyKey: 'convert-123',
      };
      const rate = 0.85;

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(true);
      queryRunner.queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.convertCurrency('user-123', convertDto, rate),
      ).rejects.toThrow(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockRedisService.releaseLock).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const convertDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.EUR,
        amount: 2000,
        idempotencyKey: 'convert-123',
      };
      const rate = 0.85;

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(true);
      queryRunner.queryBuilder.getOne.mockResolvedValue({
        ...mockWalletBalance,
        balance: '1000.00',
      });

      await expect(
        service.convertCurrency('user-123', convertDto, rate),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.convertCurrency('user-123', convertDto, rate),
      ).rejects.toThrow('Insufficient USD balance');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should release first lock if second lock fails', async () => {
      const convertDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.EUR,
        amount: 100,
        idempotencyKey: 'convert-123',
      };
      const rate = 0.85;

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await expect(
        service.convertCurrency('user-123', convertDto, rate),
      ).rejects.toThrow(ConflictException);
      expect(mockRedisService.releaseLock).toHaveBeenCalledTimes(1);
    });
  });

  describe('tradeCurrency', () => {
    it('should trade currency successfully', async () => {
      const tradeDto = {
        fromCurrency: Currency.EUR,
        toCurrency: Currency.GBP,
        amount: 100,
        idempotencyKey: 'trade-123',
      };
      const rate = 0.88;

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockRedisService.acquireLock.mockResolvedValue(true);
      queryRunner.queryBuilder.getOne
        .mockResolvedValueOnce({
          ...mockWalletBalanceEUR,
          balance: '500.00',
        })
        .mockResolvedValueOnce(null);
      queryRunner.manager.save.mockResolvedValue({});
      queryRunner.manager.create.mockReturnValue({});
      queryRunner.manager.save.mockResolvedValueOnce({});
      queryRunner.manager.save.mockResolvedValueOnce({});
      queryRunner.manager.save.mockResolvedValueOnce({
        id: 'txn-trade',
        type: TransactionType.TRADE,
      });

      const result = await service.tradeCurrency('user-123', tradeDto, rate);

      expect(mockRedisService.acquireLock).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRedisService.releaseLock).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for same currency trade', async () => {
      const tradeDto = {
        fromCurrency: Currency.GBP,
        toCurrency: Currency.GBP,
        amount: 100,
        idempotencyKey: 'trade-123',
      };
      const rate = 1;

      await expect(
        service.tradeCurrency('user-123', tradeDto, rate),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.tradeCurrency('user-123', tradeDto, rate),
      ).rejects.toThrow('Cannot trade to the same currency');
    });
  });
});
