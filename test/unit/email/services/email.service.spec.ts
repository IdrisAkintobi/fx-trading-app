import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from '../../../../src/modules/email/email.service';
import { mockMailerService } from '../mocks/services.mock';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    module.useLogger(false); // Disable logging for this module

    service = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should send OTP email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const result = await service.sendOtp('test@example.com', '123456');

      expect(result).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Your OTP Verification Code',
        text: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
      });
    });

    it('should include expiration time in email', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendOtp('test@example.com', '123456');

      const callArgs = mockMailerService.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain('10 minutes');
      expect(callArgs.html).toContain('10 minutes');
    });

    it('should return false when email sending fails', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendOtp('test@example.com', '123456');

      expect(result).toBe(false);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const result = await service.sendWelcomeEmail(
        'test@example.com',
        'John Doe',
      );

      expect(result).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to FX Trading App',
        text: expect.stringContaining('John Doe'),
        html: expect.stringContaining('John Doe'),
      });
    });

    it('should include app features in welcome email', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await service.sendWelcomeEmail('test@example.com', 'John Doe');

      const callArgs = mockMailerService.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Funding your multi-currency wallet');
      expect(callArgs.html).toContain('Trading between different currencies');
    });

    it('should return false when email sending fails', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendWelcomeEmail(
        'test@example.com',
        'John Doe',
      );

      expect(result).toBe(false);
    });
  });
});
