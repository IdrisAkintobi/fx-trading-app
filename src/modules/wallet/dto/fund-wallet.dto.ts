import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
} from 'class-validator';
import { Currency } from '../../../common/constants/enums';

export class FundWalletDto {
  @IsEnum(Currency)
  currency: Currency;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
