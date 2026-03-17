import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './env.schema';

export function validate(config: Record<string, unknown>) {
  // Apply defaults
  const configWithDefaults = {
    ...config,
    NODE_ENV: config.NODE_ENV || 'development',
    PORT: config.PORT || 3000,
    DATABASE_HOST: config.DATABASE_HOST || 'localhost',
    DATABASE_PORT: config.DATABASE_PORT || 5432,
    DATABASE_USER: config.DATABASE_USER || 'postgres',
    DATABASE_PASSWORD: config.DATABASE_PASSWORD || 'postgres',
    DATABASE_NAME: config.DATABASE_NAME || 'fx_trading',
    DATABASE_SYNC: config.DATABASE_SYNC || false,
    DATABASE_LOGGING: config.DATABASE_LOGGING || false,
    REDIS_HOST: config.REDIS_HOST || 'localhost',
    REDIS_PORT: config.REDIS_PORT || 6379,
    OTP_EXPIRATION_SEC: config.OTP_EXPIRATION_SEC || 600,
    OTP_LENGTH: config.OTP_LENGTH || 6,
    FX_RATE_CACHE_TTL_SEC: config.FX_RATE_CACHE_TTL_SEC || 300,
    RATE_LIMIT_TTL: config.RATE_LIMIT_TTL || 60,
    RATE_LIMIT_MAX: config.RATE_LIMIT_MAX || 100,
  };

  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    configWithDefaults,
    {
      enableImplicitConversion: true,
    },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
