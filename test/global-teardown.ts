import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';

/**
 * Global teardown - runs once after all E2E tests complete
 * Cleans up the test database
 */
export default async function globalTeardown() {
  // Load test environment variables
  const envPath = resolve(process.cwd(), '.env.test');
  config({ path: envPath });

  // Connect to test database
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number.parseInt(process.env.DATABASE_PORT!, 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await dataSource.initialize();

    console.log('Cleaning up test database...');

    // Disable foreign key checks
    await dataSource.query('SET session_replication_role = replica;');

    // Get all tables
    const tables = await dataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    // Truncate all tables
    for (const { tablename } of tables) {
      await dataSource.query(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }

    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');

    console.log('Test database cleaned up successfully');

    await dataSource.destroy();
  } catch (error) {
    console.error('Failed to clean up test database:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}
