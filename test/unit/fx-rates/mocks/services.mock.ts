export const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
};

export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string | number> = {
      FX_RATE_API_URL: 'https://api.exchangerate.com',
      FX_RATE_API_KEY: 'test-api-key',
      FX_RATE_CACHE_TTL_SEC: 300,
    };
    return config[key];
  }),
};
