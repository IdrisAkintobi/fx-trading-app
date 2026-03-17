import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
    this.cacheTtl = this.configService.get<number>('FX_RATE_CACHE_TTL_SEC')!;
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
      this.logger.log(
        `Fetching exchange rate from API: ${fromCurrency} -> ${toCurrency}`,
      );

      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(
          `API responded with status ${response.status} for ${fromCurrency}/${toCurrency}`,
        );

        if (response.status === 404) {
          throw new BadRequestException(
            `Currency pair ${fromCurrency}/${toCurrency} not supported`,
          );
        }

        throw new ServiceUnavailableException(
          'Exchange rate service is temporarily unavailable. Please try again later.',
        );
      }

      const data = (await response.json()) as PairConversionApiResponse;

      if (data.result !== 'success') {
        this.logger.error(
          `API returned unsuccessful result for ${fromCurrency}/${toCurrency}`,
        );
        throw new ServiceUnavailableException(
          'Failed to fetch exchange rate. Please try again later.',
        );
      }

      this.logger.log(
        `Successfully fetched rate for ${fromCurrency}/${toCurrency}: ${data.conversion_rate}`,
      );

      return data.conversion_rate;
    } catch (error) {
      // If it's already a NestJS exception, rethrow it
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      // Network or other errors
      this.logger.error(
        `Network error fetching rate from API: ${fromCurrency}/${toCurrency}`,
        error,
      );
      throw new ServiceUnavailableException(
        'Unable to connect to exchange rate service. Please try again later.',
      );
    }
  }

  private getCacheKey(fromCurrency: Currency, toCurrency: Currency): string {
    return `fx:${fromCurrency}:${toCurrency}`;
  }
}
