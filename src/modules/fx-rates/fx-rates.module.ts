import { Module } from '@nestjs/common';
import { FxRatesService } from './fx-rates.service';
import { FxRatesController } from './fx-rates.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FxRatesController],
  providers: [FxRatesService],
  exports: [FxRatesService],
})
export class FxRatesModule {}
