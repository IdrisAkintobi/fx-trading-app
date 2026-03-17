import { IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsBoolean()
  DATABASE_SYNC: boolean;

  @IsBoolean()
  DATABASE_LOGGING: boolean;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRATION: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRATION: string;

  @IsNumber()
  OTP_EXPIRATION_SEC: number;

  @IsNumber()
  OTP_LENGTH: number;

  @IsString()
  FX_RATE_API_URL: string;

  @IsString()
  FX_RATE_API_KEY: string;

  @IsNumber()
  FX_RATE_CACHE_TTL_SEC: number;

  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  SMTP_PORT: number;

  @IsBoolean()
  SMTP_SECURE: boolean;

  @IsString()
  SMTP_USER: string;

  @IsString()
  SMTP_PASSWORD: string;

  @IsString()
  EMAIL_FROM: string;

  @IsNumber()
  RATE_LIMIT_TTL: number;

  @IsNumber()
  RATE_LIMIT_MAX: number;
}
