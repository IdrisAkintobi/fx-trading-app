import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { EmailService } from '../../src/modules/email/email.service';
import { FxRatesService } from '../../src/modules/fx-rates/fx-rates.service';
import { setupE2EApp } from './test-setup';

describe('Auth Flow (e2e)', () => {
  let app: INestApplication<App>;
  let emailService: EmailService;
  let generatedOtp: string;
  let resetToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendOtp: jest.fn().mockResolvedValue(true),
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        sendPasswordReset: jest.fn().mockResolvedValue(true),
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

    emailService = moduleFixture.get<EmailService>(EmailService);
  });

  afterAll(async () => {
    // Cleanup handled by global teardown
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
      expect(response.body.message).toContain('Registration successful');
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
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testEmail,
          otp: generatedOtp,
        })
        .expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Email verified successfully',
      );
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
      return request(app.getHttpServer())
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
        .expect(400);
    });
  });

  describe('Password Reset Flow', () => {
    const testEmail = `reset-${Date.now()}@example.com`;
    const testPassword = 'OldPassword123!';
    const newPassword = 'NewPassword456!';
    let userOtp: string;

    // Register and verify a user first
    beforeAll(async () => {
      // Register
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      // Get OTP
      const otpCall = (emailService.sendOtp as jest.Mock).mock.calls.find(
        (call) => call[0] === testEmail,
      );
      if (otpCall) {
        userOtp = otpCall[1];
      }

      // Verify email
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({
          email: testEmail,
          otp: userOtp,
        })
        .expect(200);
    });

    it('should request password reset for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/request-password-reset')
        .send({
          email: testEmail,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'If an account with that email exists',
      );
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        testEmail,
        expect.any(String),
      );

      // Capture the reset token from the mock call
      const resetCall = (
        emailService.sendPasswordReset as jest.Mock
      ).mock.calls.find((call) => call[0] === testEmail);
      if (resetCall) {
        resetToken = resetCall[1];
      }
    });

    it('should return success message for non-existent email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/request-password-reset')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'If an account with that email exists',
      );
    });

    it('should fail to reset password with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          email: testEmail,
          token: 'invalid_token',
          newPassword,
        })
        .expect(400);
    });

    it('should reset password with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          email: testEmail,
          token: resetToken,
          newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'Password has been reset successfully',
      );
    });

    it('should not allow reusing the same reset token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          email: testEmail,
          token: resetToken,
          newPassword: 'AnotherPassword789!',
        })
        .expect(400);
    });

    it('should login with new password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should not login with old password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(401);
    });

    it('should validate new password length', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          email: testEmail,
          token: 'some_token',
          newPassword: 'short',
        })
        .expect(400);
    });
  });
});
