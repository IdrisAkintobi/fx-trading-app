import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Currency, TransactionType } from '../../src/common/constants/enums';
import { EmailService } from '../../src/modules/email/email.service';
import { FxRatesService } from '../../src/modules/fx-rates/fx-rates.service';
import { setupE2EApp } from './test-setup';

describe('Transactions (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendOtp: jest.fn().mockResolvedValue(true),
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      })
      .overrideProvider(FxRatesService)
      .useValue({
        getRate: jest.fn().mockImplementation((from, to) => {
          if (from === to) return Promise.resolve(1);
          return Promise.resolve(0.85);
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupE2EApp(app);
    await app.init();

    // Create and verify a test user
    const testEmail = `txn-test-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    // Register
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword });

    // Get OTP from EmailService mock
    const emailService = moduleFixture.get<EmailService>(EmailService);
    const otpCall = (emailService.sendOtp as jest.Mock).mock.calls.find(
      (call) => call[0] === testEmail,
    );
    const generatedOtp = otpCall ? otpCall[1] : '';

    // Verify email
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: testEmail, otp: generatedOtp });

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginResponse.body.accessToken;

    // Create some transactions
    await request(app.getHttpServer())
      .post('/api/v1/wallet/fund')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currency: Currency.USD,
        amount: 1000,
        idempotencyKey: `txn-fund-1-${Date.now()}`,
      });

    await request(app.getHttpServer())
      .post('/api/v1/wallet/fund')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currency: Currency.EUR,
        amount: 500,
        idempotencyKey: `txn-fund-2-${Date.now()}`,
      });

    await request(app.getHttpServer())
      .post('/api/v1/wallet/convert')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fromCurrency: Currency.EUR,
        toCurrency: Currency.GBP,
        amount: 100,
        idempotencyKey: `txn-convert-1-${Date.now()}`,
      });
  });

  afterAll(async () => {
    // Cleanup handled by global teardown
    await app.close();
  });

  describe('Transaction Listing', () => {
    it('should get all transactions with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
    });

    it('should filter transactions by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: TransactionType.FUND })
        .expect(200);

      expect(response.body.data.every((txn) => txn.type === 'FUND')).toBe(true);
    });

    it('should filter transactions by currency', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ currency: Currency.USD })
        .expect(200);

      expect(
        response.body.data.every(
          (txn) =>
            txn.fromCurrency === Currency.USD ||
            txn.toCurrency === Currency.USD,
        ),
      ).toBe(true);
    });

    it('should filter transactions by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction Details', () => {
    let transactionId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 1 });

      transactionId = response.body.data[0]?.id;
    });

    it('should get single transaction by id', async () => {
      if (!transactionId) {
        return; // Skip if no transactions
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', transactionId);
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Transaction Statistics', () => {
    it('should get transaction statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalTransactions');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byCurrency');
      expect(response.body.totalTransactions).toBeGreaterThanOrEqual(3);
    });

    it('should get transaction statistics filtered by currency', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/transactions/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ currency: Currency.USD })
        .expect(200);

      expect(response.body).toHaveProperty('totalTransactions');
      expect(response.body).toHaveProperty('byType');
      expect(response.body).toHaveProperty('byCurrency');
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response1.body.meta.page).toBe(1);
      expect(response1.body.meta.limit).toBe(2);
      expect(response1.body.data.length).toBeLessThanOrEqual(2);

      if (response1.body.meta.hasNextPage) {
        const response2 = await request(app.getHttpServer())
          .get('/api/v1/transactions')
          .set('Authorization', `Bearer ${accessToken}`)
          .query({ page: 2, limit: 2 })
          .expect(200);

        expect(response2.body.meta.page).toBe(2);
        expect(response2.body.data[0].id).not.toBe(response1.body.data[0]?.id);
      }
    });
  });

  describe('Unauthorized Access', () => {
    it('should not allow viewing transactions without authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/transactions')
        .expect(401);
    });

    it('should not allow viewing transaction details without authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/transactions/some-id')
        .expect(401);
    });

    it('should not allow viewing statistics without authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/transactions/stats')
        .expect(401);
    });
  });
});
