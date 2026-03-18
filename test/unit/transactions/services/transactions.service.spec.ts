import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { Transaction } from '../../../../src/modules/transactions/entities/transaction.entity';
import {
  Currency,
  TransactionType,
} from '../../../../src/common/constants/enums';
import {
  mockTransactionRepository,
  createMockQueryBuilder,
} from '../mocks/repository.mock';
import { mockTransaction, mockTransactions } from '../mocks/data.mock';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let queryBuilder: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    // Create a fresh queryBuilder for each test
    queryBuilder = createMockQueryBuilder();
    mockTransactionRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.findAll({
        userId: 'user1',
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([mockTransaction]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should filter by transaction type', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        userId: 'user1',
        type: TransactionType.CONVERT,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.type = :type',
        { type: TransactionType.CONVERT },
      );
    });

    it('should filter by currency', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        userId: 'user1',
        currency: Currency.EUR,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '("transaction"."fromCurrency"::text = :currency OR "transaction"."toCurrency"::text = :currency)',
        { currency: Currency.EUR },
      );
    });

    it('should handle pagination correctly', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([mockTransactions, 10]);

      const result = await service.findAll({
        userId: 'user1',
        page: 2,
        limit: 5,
      });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id and userId', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findOne('1', 'user1');

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1', userId: 'user1' },
      });
    });

    it('should return null if transaction not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('1', 'user1');

      expect(result).toBeNull();
    });
  });

  describe('getTransactionStats', () => {
    it('should calculate transaction statistics correctly', async () => {
      queryBuilder.getMany.mockResolvedValue(mockTransactions);

      const result = await service.getTransactionStats('user1');

      expect(result.totalTransactions).toBe(2);
      expect(result.byType[TransactionType.FUND]).toBe(1);
      expect(result.byType[TransactionType.CONVERT]).toBe(1);
      expect(result.byCurrency[Currency.USD].funded).toBe('100.00');
      expect(result.byCurrency[Currency.USD].spent).toBe('100.00');
    });

    it('should filter stats by currency when provided', async () => {
      queryBuilder.getMany.mockResolvedValue([mockTransaction]);

      await service.getTransactionStats('user1', Currency.USD);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '("transaction"."fromCurrency"::text = :currency OR "transaction"."toCurrency"::text = :currency)',
        { currency: Currency.USD },
      );
    });
  });
});
