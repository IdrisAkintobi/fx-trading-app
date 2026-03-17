import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
} from 'class-validator';
import { Currency } from '../../../common/constants/enums';

export class ConvertCurrencyDto {
  @IsEnum(Currency)
  fromCurrency: Currency;

  @IsEnum(Currency)
  toCurrency: Currency;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
