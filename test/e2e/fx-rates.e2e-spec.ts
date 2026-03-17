import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Currency } from '../../src/common/constants/enums';
import { EmailService } from '../../src/modules/email/email.service';
import { FxRatesService } from '../../src/modules/fx-rates/fx-rates.service';

describe('FX Rates (e2e)', () => {
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
        getRate: jest.fn().mockResolvedValue(0.85),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create and verify a test user
    const testEmail = `fx-test-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: testPassword });

    const emailService = moduleFixture.get<EmailService>(EmailService);
    const otpCall = (emailService.sendOtp as jest.Mock).mock.calls.find(
      (call) => call[0] === testEmail,
    );
    const generatedOtp = otpCall ? otpCall[1] : '';

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email: testEmail, otp: generatedOtp });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Exchange Rate Retrieval', () => {
    it('should get exchange rate between two currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ from: Currency.USD, to: Currency.EUR })
        .expect(200);

      expect(response.body).toHaveProperty('from', Currency.USD);
      expect(response.body).toHaveProperty('to', Currency.EUR);
      expect(response.body).toHaveProperty('rate');
      expect(typeof response.body.rate).toBe('number');
      expect(response.body.rate).toBe(0.85);
    });

    it('should get exchange rate for different currency pairs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ from: Currency.EUR, to: Currency.GBP })
        .expect(200);

      expect(response.body).toHaveProperty('from', Currency.EUR);
      expect(response.body).toHaveProperty('to', Currency.GBP);
      expect(response.body).toHaveProperty('rate', 0.85);
    });

    it('should return 1 for same currency conversion', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ from: Currency.USD, to: Currency.USD })
        .expect(200);

      expect(response.body).toHaveProperty('rate', 1);
    });

    it('should validate currency parameters', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ from: 'INVALID', to: Currency.EUR })
        .expect(400);
    });

    it('should require both from and to parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ from: Currency.USD })
        .expect(400);

      return request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ to: Currency.EUR })
        .expect(400);
    });
  });

  describe('Unauthorized Access', () => {
    it('should not allow rate retrieval without authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/fx-rates/rate')
        .query({ from: Currency.USD, to: Currency.EUR })
        .expect(401);
    });
  });
});
