import { Currency } from '../../../../src/common/constants/enums';
import { WalletBalance } from '../../../../src/modules/wallet/entities/wallet-balance.entity';

export const mockWalletBalance = {
  id: 'balance-123',
  userId: 'user-123',
  currency: Currency.USD,
  balance: '1000.00',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} as WalletBalance;

export const mockWalletBalanceEUR = {
  id: 'balance-456',
  userId: 'user-123',
  currency: Currency.EUR,
  balance: '500.00',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} as WalletBalance;

export const mockWalletBalances: WalletBalance[] = [
  mockWalletBalance,
  mockWalletBalanceEUR,
];
