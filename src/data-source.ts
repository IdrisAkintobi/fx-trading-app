import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { LogLevel } from './config/env.schema';

// Load environment variables from .env.test if in test mode
if (process.env.NODE_ENV === 'test') {
  const envPath = resolve(process.cwd(), '.env.test');
  config({ path: envPath });
}

const isProduction = process.env.NODE_ENV === 'production';

// Environment variables are validated by NestJS ConfigModule on app startup
// For data-source.ts, ensure .env file is loaded before importing this file
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST!,
  port: Number.parseInt(process.env.DATABASE_PORT!, 10),
  username: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
  entities: isProduction
    ? ['dist/**/*.entity{.ts,.js}']
    : ['src/**/*.entity{.ts,.js}'],
  migrations: isProduction
    ? ['dist/database/migrations/*{.ts,.js}']
    : ['src/database/migrations/*{.ts,.js}'],
  synchronize: process.env.DATABASE_SYNC === 'true',
  logging:
    process.env.LOG_LEVEL === LogLevel.Debug
      ? 'all'
      : ['error', 'warn', 'schema'],
  // Connection pool settings to prevent concurrent query warnings
  extra: {
    max: 10, // Maximum number of clients in the pool
    min: 2, // Minimum number of clients in the pool
  },
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
