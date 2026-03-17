import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FxRatesService } from '../../../../src/modules/fx-rates/fx-rates.service';
import { RedisService } from '../../../../src/modules/redis/redis.service';
import { Currency } from '../../../../src/common/constants/enums';
import { mockRedisService, mockConfigService } from '../mocks/services.mock';
import {
  mockFxRateApiResponse,
  mockFxRateFailedResponse,
} from '../mocks/data.mock';

describe('FxRatesService', () => {
  let service: FxRatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxRatesService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    module.useLogger(false); // Disable logging for this module

    service = module.get<FxRatesService>(FxRatesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRate', () => {
    it('should return 1 for same currency conversion', async () => {
      const rate = await service.getRate(Currency.USD, Currency.USD);
      expect(rate).toBe(1);
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should return cached rate if available', async () => {
      const cachedRate = '1.2345';
      mockRedisService.get.mockResolvedValue(cachedRate);

      const rate = await service.getRate(Currency.USD, Currency.EUR);

      expect(rate).toBe(1.2345);
      expect(mockRedisService.get).toHaveBeenCalledWith('fx:USD:EUR');
    });

    it('should fetch from API and cache when cache misses', async () => {
      mockRedisService.get.mockResolvedValue(null);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFxRateApiResponse),
      });

      const rate = await service.getRate(Currency.USD, Currency.EUR);

      expect(rate).toBe(0.85);
      expect(mockRedisService.get).toHaveBeenCalledWith('fx:USD:EUR');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'fx:USD:EUR',
        '0.85',
        300,
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://api.exchangerate.com/test-api-key/pair/USD/EUR',
      );
    });

    it('should throw error when API fails', async () => {
      mockRedisService.get.mockResolvedValue(null);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        service.getRate(Currency.USD, Currency.EUR),
      ).rejects.toThrow();
    });

    it('should throw error when API returns unsuccessful result', async () => {
      mockRedisService.get.mockResolvedValue(null);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFxRateFailedResponse),
      });

      await expect(
        service.getRate(Currency.USD, Currency.EUR),
      ).rejects.toThrow();
    });
  });
});
