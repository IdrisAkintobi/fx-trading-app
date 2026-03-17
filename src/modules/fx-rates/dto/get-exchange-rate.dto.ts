import { IsEnum, IsNotEmpty } from 'class-validator';
import { Currency } from '../../../common/constants/enums';

export class GetExchangeRateDto {
  @IsNotEmpty({ message: 'From currency is required' })
  @IsEnum(Currency, { message: 'Invalid source currency' })
  from: Currency;

  @IsNotEmpty({ message: 'To currency is required' })
  @IsEnum(Currency, { message: 'Invalid target currency' })
  to: Currency;
}
