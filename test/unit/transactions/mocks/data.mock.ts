import {
  Currency,
  TransactionType,
  TransactionStatus,
} from '../../../../src/common/constants/enums';

export const mockTransaction = {
  id: '1',
  userId: 'user1',
  type: TransactionType.FUND,
  toCurrency: Currency.USD,
  toAmount: '100.00',
  fromCurrency: null,
  fromAmount: null,
  rate: null,
  status: TransactionStatus.COMPLETED,
  idempotencyKey: 'test-key',
  metadata: null,
  createdAt: new Date('2024-01-01'),
};

export const mockTransactions = [
  mockTransaction,
  {
    id: '2',
    userId: 'user1',
    type: TransactionType.CONVERT,
    toCurrency: Currency.EUR,
    toAmount: '85.00',
    fromCurrency: Currency.USD,
    fromAmount: '100.00',
    rate: '0.85',
    status: TransactionStatus.COMPLETED,
    idempotencyKey: 'test-key-2',
    metadata: null,
    createdAt: new Date('2024-01-02'),
  },
];
