import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { RedisService } from '../../src/modules/redis/redis.service';

/**
 * Clean up test database by truncating all tables
 * This ensures tests start with a clean slate
 */
export async function cleanupTestDatabase(
  app: INestApplication,
): Promise<void> {
  const dataSource = app.get(DataSource);

  if (!dataSource.isInitialized) {
    return;
  }

  try {
    // Get all table names
    const entities = dataSource.entityMetadatas;

    // Disable foreign key checks
    await dataSource.query('SET session_replication_role = replica;');

    // Truncate all tables
    for (const entity of entities) {
      const tableName = entity.tableName;
      await dataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    }

    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');
  } catch (error) {
    console.error('Failed to clean up test database:', error);
    throw error;
  }
}

/**
 * Clean up Redis cache
 * Flushes all keys in the current Redis database
 */
export async function cleanupRedis(app: INestApplication): Promise<void> {
  const redisService = app.get(RedisService);

  try {
    await redisService.flushDb();
  } catch (error) {
    console.error('Failed to clean up Redis:', error);
    throw error;
  }
}

/**
 * Complete cleanup - both database and Redis
 */
export async function cleanupTestEnvironment(
  app: INestApplication,
): Promise<void> {
  await Promise.all([cleanupTestDatabase(app), cleanupRedis(app)]);
}
