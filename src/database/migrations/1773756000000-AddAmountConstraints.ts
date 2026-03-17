import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAmountConstraints1773756000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CHECK constraint for wallet_balances - balance must be non-negative
    await queryRunner.query(`
      ALTER TABLE "wallet_balances"
      ADD CONSTRAINT "chk_wallet_balance_non_negative"
      CHECK ("balance" >= 0)
    `);

    // Add CHECK constraint for transactions - toAmount must be at least 0.01
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "chk_transaction_to_amount_minimum"
      CHECK ("toAmount" >= 0.01)
    `);

    // Add CHECK constraint for transactions - fromAmount must be at least 0.01 if not null
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "chk_transaction_from_amount_minimum"
      CHECK ("fromAmount" IS NULL OR "fromAmount" >= 0.01)
    `);

    // Add CHECK constraint for transactions - rate must be positive if not null
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "chk_transaction_rate_positive"
      CHECK ("rate" IS NULL OR "rate" > 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop constraints in reverse order
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT "chk_transaction_rate_positive"
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT "chk_transaction_from_amount_minimum"
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT "chk_transaction_to_amount_minimum"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_balances"
      DROP CONSTRAINT "chk_wallet_balance_non_negative"
    `);
  }
}
