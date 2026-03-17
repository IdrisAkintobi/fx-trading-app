import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  Currency,
  TransactionType,
  TransactionStatus,
} from '../../../common/constants/enums';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: Currency,
    nullable: true,
  })
  fromCurrency: Currency | null;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  toCurrency: Currency;

  @Column('decimal', { precision: 20, scale: 2, nullable: true })
  fromAmount: string | null;

  @Column('decimal', { precision: 20, scale: 2 })
  toAmount: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  rate: string | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @Index()
  status: TransactionStatus;

  @Column({ type: 'varchar', unique: true, nullable: true })
  @Index()
  idempotencyKey: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
