import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency } from '../../common/constants/enums';
import { RedisService } from '../redis/redis.service';

interface PairConversionApiResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  target_code: string;
  conversion_rate: number;
}

@Injectable()
export class FxRatesService {
  private readonly logger = new Logger(FxRatesService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly cacheTtl: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('FX_RATE_API_URL')!;
    this.apiKey = this.configService.get<string>('FX_RATE_API_KEY')!;
    this.cacheTtl = this.configService.get<number>(
      'FX_RATE_CACHE_TTL_SEC',
      300,
    );
  }

  async getRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    // Try to get from cache first
    const cacheKey = this.getCacheKey(fromCurrency, toCurrency);
    const cachedRate = await this.redisService.get(cacheKey);

    if (cachedRate) {
      this.logger.debug(
        `Cache hit for ${fromCurrency}/${toCurrency}: ${cachedRate}`,
      );
      return Number.parseFloat(cachedRate);
    }

    // Cache miss - fetch from API
    this.logger.debug(
      `Cache miss for ${fromCurrency}/${toCurrency}, fetching from API`,
    );
    return this.fetchAndCacheRate(fromCurrency, toCurrency);
  }

  private async fetchAndCacheRate(
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<number> {
    const rate = await this.fetchPairRateFromApi(fromCurrency, toCurrency);

    // Cache the rate
    const cacheKey = this.getCacheKey(fromCurrency, toCurrency);
    await this.redisService.set(cacheKey, rate.toString(), this.cacheTtl);

    return rate;
  }

  private async fetchPairRateFromApi(
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<number> {
    const url = `${this.apiUrl}/${this.apiKey}/pair/${fromCurrency}/${toCurrency}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = (await response.json()) as PairConversionApiResponse;

      if (data.result !== 'success') {
        throw new Error('API request was not successful');
      }

      return data.conversion_rate;
    } catch (error) {
      this.logger.error(`Failed to fetch rate from API: ${url}`, error);
      throw error;
    }
  }

  private getCacheKey(fromCurrency: Currency, toCurrency: Currency): string {
    return `fx:${fromCurrency}:${toCurrency}`;
  }
}
