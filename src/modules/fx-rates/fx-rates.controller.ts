import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetExchangeRateDto } from './dto/get-exchange-rate.dto';
import { FxRatesService } from './fx-rates.service';

@Controller('api/v1/fx-rates')
@UseGuards(JwtAuthGuard)
export class FxRatesController {
  constructor(private readonly fxRatesService: FxRatesService) {}

  @Get('rate')
  async getRate(@Query() query: GetExchangeRateDto) {
    const rate = await this.fxRatesService.getRate(query.from, query.to);
    return {
      from: query.from,
      to: query.to,
      rate,
      timestamp: new Date().toISOString(),
    };
  }
}
