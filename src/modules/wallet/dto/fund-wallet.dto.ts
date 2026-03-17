import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Currency } from '../../../common/constants/enums';

export class FundWalletDto {
  @IsEnum(Currency)
  currency: Currency;

  @IsNumber()
  @IsPositive()
  @Min(0.01, { message: 'Minimum funding amount is 0.01' })
  @Max(1000000, { message: 'Maximum funding amount is 1,000,000' })
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
