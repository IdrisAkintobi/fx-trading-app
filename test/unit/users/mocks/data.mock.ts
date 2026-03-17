import { UserRole } from '../../../../src/common/constants/enums';
import { User } from '../../../../src/modules/users/entities/user.entity';

export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  password: '$argon2id$v=19$m=65536,t=3,p=4$hashedpassword',
  isVerified: false,
  disabled: false,
  role: UserRole.USER,
  walletBalances: [],
  transactions: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockVerifiedUser: User = {
  ...mockUser,
  id: 'user-456',
  email: 'verified@example.com',
  isVerified: true,
};
