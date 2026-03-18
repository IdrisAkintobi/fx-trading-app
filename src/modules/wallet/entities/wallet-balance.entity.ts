import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Currency } from '../../../common/constants/enums';
import { User } from '../../users/entities/user.entity';

@Entity('wallet_balances')
@Index(['userId', 'currency'], { unique: true })
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  @Exclude()
  userId: string;

  @ManyToOne(() => User, (user) => user.walletBalances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @Exclude()
  user: User;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column('decimal', { precision: 20, scale: 2, default: 0 })
  balance: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
