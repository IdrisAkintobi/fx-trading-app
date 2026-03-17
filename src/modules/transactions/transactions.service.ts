import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Currency,
  TransactionStatus,
  TransactionType,
} from '../../common/constants/enums';
import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../../common/dto/pagination.dto';
import { Transaction } from './entities/transaction.entity';

export interface TransactionFilterDto {
  userId: string;
  type?: TransactionType;
  currency?: Currency;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(
    filters: TransactionFilterDto,
  ): Promise<PaginatedResponse<Transaction>> {
    const {
      userId,
      type,
      currency,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Use query builder for complex filters
    let queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (type) {
      queryBuilder = queryBuilder.andWhere('transaction.type = :type', {
        type,
      });
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('transaction.status = :status', {
        status,
      });
    }

    if (currency) {
      queryBuilder = queryBuilder.andWhere(
        '(transaction.fromCurrency = :currency OR transaction.toCurrency = :currency)',
        { currency },
      );
    }

    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere(
        'transaction.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    } else if (startDate) {
      queryBuilder = queryBuilder.andWhere(
        'transaction.createdAt >= :startDate',
        { startDate },
      );
    }

    const [data, total] = await queryBuilder
      .orderBy('transaction.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, userId: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { id, userId },
    });
  }

  async getTransactionStats(userId: string, currency?: Currency) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.COMPLETED,
      });

    if (currency) {
      queryBuilder.andWhere(
        '(transaction.fromCurrency = :currency OR transaction.toCurrency = :currency)',
        { currency },
      );
    }

    const transactions = await queryBuilder.getMany();

    const stats = {
      totalTransactions: transactions.length,
      byType: this.initializeTypeCounters(),
      byCurrency: {} as Record<string, { funded: string; spent: string }>,
    };

    // Calculate stats
    for (const tx of transactions) {
      stats.byType[tx.type]++;
      this.updateCurrencyStats(stats.byCurrency, tx);
    }

    return stats;
  }

  private initializeTypeCounters(): Record<TransactionType, number> {
    const counters = {} as Record<TransactionType, number>;
    for (const type of Object.values(TransactionType)) {
      counters[type] = 0;
    }
    return counters;
  }

  private updateCurrencyStats(
    byCurrency: Record<string, { funded: string; spent: string }>,
    tx: Transaction,
  ): void {
    switch (tx.type) {
      case TransactionType.FUND:
        this.addFundedAmount(byCurrency, tx.toCurrency, tx.toAmount);
        break;
      case TransactionType.CONVERT:
      case TransactionType.TRADE:
        if (tx.fromCurrency) {
          this.addSpentAmount(
            byCurrency,
            tx.fromCurrency,
            tx.fromAmount || '0',
          );
        }
        break;
    }
  }

  private addFundedAmount(
    byCurrency: Record<string, { funded: string; spent: string }>,
    currency: string,
    amount: string,
  ): void {
    if (!byCurrency[currency]) {
      byCurrency[currency] = { funded: '0', spent: '0' };
    }
    const current = Number.parseFloat(byCurrency[currency].funded);
    byCurrency[currency].funded = (current + Number.parseFloat(amount)).toFixed(
      2,
    );
  }

  private addSpentAmount(
    byCurrency: Record<string, { funded: string; spent: string }>,
    currency: string,
    amount: string,
  ): void {
    if (!byCurrency[currency]) {
      byCurrency[currency] = { funded: '0', spent: '0' };
    }
    const current = Number.parseFloat(byCurrency[currency].spent);
    byCurrency[currency].spent = (current + Number.parseFloat(amount)).toFixed(
      2,
    );
  }
}
