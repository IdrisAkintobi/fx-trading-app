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

export class ConvertCurrencyDto {
  @IsEnum(Currency)
  fromCurrency: Currency;

  @IsEnum(Currency)
  toCurrency: Currency;

  @IsNumber()
  @IsPositive()
  @Min(0.01, { message: 'Minimum conversion amount is 0.01' })
  @Max(1000000, { message: 'Maximum conversion amount is 1,000,000' })
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
