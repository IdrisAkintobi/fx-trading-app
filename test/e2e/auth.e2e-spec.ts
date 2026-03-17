import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { EmailService } from '../../src/modules/email/email.service';
import { FxRatesService } from '../../src/modules/fx-rates/fx-rates.service';
import { RedisService } from '../../src/modules/redis/redis.service';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication<App>;
  let redisService: RedisService;
  let emailService: EmailService;
  let generatedOtp: string;

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

    redisService = moduleFixture.get<RedisService>(RedisService);
    emailService = moduleFixture.get<EmailService>(EmailService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration and Verification Flow', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    let accessToken: string;

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('OTP sent');
      expect(emailService.sendOtp).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
      );

      // Capture the OTP from the mock call
      const otpCall = (emailService.sendOtp as jest.Mock).mock.calls.find(
        (call) => call[0] === testEmail,
      );
      if (otpCall) {
        generatedOtp = otpCall[1];
      }
    });

    it('should not register duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });

    it('should fail verification with wrong OTP', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testEmail,
          otp: '000000',
        })
        .expect(400);
    });

    it('should verify email with correct OTP', async () => {
      // Get the stored OTP from Redis directly for testing
      const otpKeys = await redisService.keys(`otp:${testEmail}:*`);
      expect(otpKeys.length).toBeGreaterThan(0);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testEmail,
          otp: generatedOtp,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Email verified');
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        testEmail,
        testEmail,
      );
    });

    it('should not verify with same OTP twice', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testEmail,
          otp: generatedOtp,
        })
        .expect(400);
    });

    it('should login with verified account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.accessToken).toBeTruthy();
      accessToken = response.body.accessToken;
    });

    it('should not login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should access protected route with token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).toHaveProperty('isVerified', true);
    });

    it('should not access protected route without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });
  });

  describe('OTP Resend Flow', () => {
    const testEmail = `resend-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    it('should register user and allow OTP resend', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      // Clear previous calls
      (emailService.sendOtp as jest.Mock).mockClear();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({
          email: testEmail,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(emailService.sendOtp).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
      );
    });

    it('should not send OTP to non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(404);
    });
  });
});
