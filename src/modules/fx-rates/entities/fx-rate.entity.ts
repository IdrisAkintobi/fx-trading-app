import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Currency } from '../../../common/constants/enums';

@Entity('fx_rates')
@Index(['baseCurrency', 'targetCurrency', 'fetchedAt'])
export class FxRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  baseCurrency: Currency;

  @Column({
    type: 'enum',
    enum: Currency,
  })
  targetCurrency: Currency;

  @Column('decimal', { precision: 20, scale: 8 })
  rate: string;

  @CreateDateColumn()
  @Index()
  fetchedAt: Date;
}
