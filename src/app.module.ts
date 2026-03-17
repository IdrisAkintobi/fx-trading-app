import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { validate } from './config/env.validation';
import { dataSourceOptions } from './data-source';
import { RedisModule } from './modules/redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate,
    }),

    // Database
    TypeOrmModule.forRoot(dataSourceOptions),

    // Redis
    RedisModule,

    // Schedule for cron jobs
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
