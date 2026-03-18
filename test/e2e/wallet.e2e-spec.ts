import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Currency } from '../../src/common/constants/enums';
import { EmailService } from '../../src/modules/email/email.service';
import { FxRatesService } from '../../src/modules/fx-rates/fx-rates.service';
import { setupE2EApp } from './test-setup';

describe('Wallet Operations (e2e)', () => {
  let app: INestApplication<App>;
  let fxRatesService: FxRatesService;
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

    fxRatesService = moduleFixture.get<FxRatesService>(FxRatesService);

    // Create and verify a test user
    const testEmail = `wallet-test-${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    // Cleanup handled by global teardown
    await app.close();
  });

  describe('Wallet Balance Operations', () => {
    it('should get empty wallet balances initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fund wallet successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currency: Currency.USD,
          amount: 1000,
          idempotencyKey: `fund-${Date.now()}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type', 'FUND');
      expect(response.body).toHaveProperty('toCurrency', Currency.USD);
      expect(response.body).toHaveProperty('toAmount', '1000');
    });

    it('should get updated balance after funding', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wallet/balance/USD')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('currency', Currency.USD);
      expect(Number.parseFloat(response.body.balance)).toBeGreaterThanOrEqual(
        1000,
      );
    });

    it('should not fund with negative amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currency: Currency.USD,
          amount: -100,
          idempotencyKey: `fund-${Date.now()}`,
        })
        .expect(400);
    });

    it('should handle idempotency for duplicate funding', async () => {
      const idempotencyKey = `idempotent-${Date.now()}`;

      const response1 = await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currency: Currency.EUR,
          amount: 500,
          idempotencyKey,
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currency: Currency.EUR,
          amount: 500,
          idempotencyKey,
        })
        .expect(201);

      expect(response1.body.id).toEqual(response2.body.id);
    });
  });

  describe('Currency Conversion Operations', () => {
    beforeAll(async () => {
      // Fund EUR wallet for conversion tests
      await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currency: Currency.EUR,
          amount: 1000,
          idempotencyKey: `fund-eur-${Date.now()}`,
        });
    });

    it('should convert currency successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wallet/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fromCurrency: Currency.EUR,
          toCurrency: Currency.GBP,
          amount: 100,
          idempotencyKey: `convert-${Date.now()}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('type', 'CONVERT');
      expect(response.body).toHaveProperty('fromCurrency', Currency.EUR);
      expect(response.body).toHaveProperty('toCurrency', Currency.GBP);
      expect(response.body).toHaveProperty('fromAmount', '100');
      expect(response.body).toHaveProperty('rate');
      expect(fxRatesService.getRate).toHaveBeenCalledWith(
        Currency.EUR,
        Currency.GBP,
      );
    });

    it('should not convert with insufficient balance', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallet/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fromCurrency: Currency.EUR,
          toCurrency: Currency.GBP,
          amount: 999999,
          idempotencyKey: `convert-${Date.now()}`,
        })
        .expect(400);
    });

    it('should not convert to same currency', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wallet/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fromCurrency: Currency.USD,
          toCurrency: Currency.USD,
          amount: 100,
          idempotencyKey: `convert-${Date.now()}`,
        })
        .expect(400);
    });
  });

  describe('Currency Trading Operations', () => {
    beforeAll(async () => {
      // Fund USD wallet for trade tests
      await request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currency: Currency.USD,
          amount: 500,
          idempotencyKey: `fund-usd-trade-${Date.now()}`,
        });
    });

    it('should trade currency successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wallet/trade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fromCurrency: Currency.USD,
          toCurrency: Currency.EUR,
          amount: 50,
          idempotencyKey: `trade-${Date.now()}`,
        })
        .expect(201);

      expect(response.body).toHaveProperty('type', 'TRADE');
      expect(response.body).toHaveProperty('fromCurrency', Currency.USD);
      expect(response.body).toHaveProperty('toCurrency', Currency.EUR);
      expect(response.body).toHaveProperty('fromAmount', '50');
    });

    it('should get all wallet balances', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('currency');
      expect(response.body.data[0]).toHaveProperty('balance');
    });
  });

  describe('Unauthorized Access', () => {
    it('should not allow funding without authentication', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/wallet/fund')
        .send({
          currency: Currency.USD,
          amount: 100,
        })
        .expect(401);
    });

    it('should not allow conversion without authentication', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/wallet/convert')
        .send({
          fromCurrency: Currency.USD,
          toCurrency: Currency.EUR,
          amount: 100,
        })
        .expect(401);
    });

    it('should not allow viewing balances without authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/wallet/balances')
        .expect(401);
    });
  });
});
