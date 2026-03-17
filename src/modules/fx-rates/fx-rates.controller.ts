import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FxRatesService } from './fx-rates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Currency } from '../../common/constants/enums';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/fx-rates')
@UseGuards(JwtAuthGuard)
export class FxRatesController {
  constructor(private readonly fxRatesService: FxRatesService) {}

  @Get()
  @Public()
  async getRate(
    @Query('from') fromCurrency: Currency,
    @Query('to') toCurrency: Currency,
  ) {
    const rate = await this.fxRatesService.getRate(fromCurrency, toCurrency);
    return {
      from: fromCurrency,
      to: toCurrency,
      rate,
    };
  }
}
