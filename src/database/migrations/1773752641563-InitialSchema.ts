import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1773752641563 implements MigrationInterface {
  name = 'InitialSchema1773752641563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."wallet_balances_currency_enum" AS ENUM('NGN', 'USD', 'EUR', 'GBP')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallet_balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "currency" "public"."wallet_balances_currency_enum" NOT NULL, "balance" numeric(20,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eebe2c6f13f1a2de3457f8a885c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_199eac1732f151d7b0f1d82872" ON "wallet_balances" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_931a3921d375922a7ef033ddab" ON "wallet_balances" ("userId", "currency") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('FUND', 'CONVERT', 'TRADE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_fromcurrency_enum" AS ENUM('NGN', 'USD', 'EUR', 'GBP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_tocurrency_enum" AS ENUM('NGN', 'USD', 'EUR', 'GBP')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('PENDING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "fromCurrency" "public"."transactions_fromcurrency_enum", "toCurrency" "public"."transactions_tocurrency_enum" NOT NULL, "fromAmount" numeric(20,2), "toAmount" numeric(20,2) NOT NULL, "rate" numeric(20,8), "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'PENDING', "idempotencyKey" character varying, "metadata" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_86238dd0ae2d79be941104a5842" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "transactions" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transactions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_86238dd0ae2d79be941104a584" ON "transactions" ("idempotencyKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e744417ceb0b530285c08f3865" ON "transactions" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "isVerified" boolean NOT NULL DEFAULT false, "disabled" boolean NOT NULL DEFAULT false, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_balances" ADD CONSTRAINT "FK_199eac1732f151d7b0f1d82872a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_balances" DROP CONSTRAINT "FK_199eac1732f151d7b0f1d82872a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e744417ceb0b530285c08f3865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_86238dd0ae2d79be941104a584"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da87c55b3bbbe96c6ed88ea7ee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6bb58f2b6e30cb51a6504599f4"`,
    );
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."transactions_tocurrency_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transactions_fromcurrency_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_931a3921d375922a7ef033ddab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_199eac1732f151d7b0f1d82872"`,
    );
    await queryRunner.query(`DROP TABLE "wallet_balances"`);
    await queryRunner.query(
      `DROP TYPE "public"."wallet_balances_currency_enum"`,
    );
  }
}
