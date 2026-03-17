import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { Currency } from '../../common/constants/enums';

@Controller('api/v1/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getBalances(@GetUser('sub') userId: string) {
    return this.walletService.getBalances(userId);
  }

  @Get('balance')
  async getBalance(
    @GetUser('sub') userId: string,
    @Query('currency') currency: Currency,
  ) {
    return this.walletService.getBalance(userId, currency);
  }

  @Post('fund')
  async fundWallet(
    @GetUser('sub') userId: string,
    @Body() fundWalletDto: FundWalletDto,
  ) {
    return this.walletService.fundWallet(userId, fundWalletDto);
  }

  @Post('convert')
  async convertCurrency(
    @GetUser('sub') userId: string,
    @Body() convertDto: ConvertCurrencyDto,
  ) {
    // TODO: Get real-time rate from FX service
    const mockRate = 1.2; // This should come from FxRatesService
    return this.walletService.convertCurrency(userId, convertDto, mockRate);
  }

  @Post('trade')
  async tradeCurrency(
    @GetUser('sub') userId: string,
    @Body() convertDto: ConvertCurrencyDto,
  ) {
    // TODO: Get real-time rate from FX service
    const mockRate = 1.2; // This should come from FxRatesService
    return this.walletService.tradeCurrency(userId, convertDto, mockRate);
  }
}
