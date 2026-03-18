import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { OtpService } from '../../../../src/modules/auth/otp.service';
import { PasswordResetService } from '../../../../src/modules/auth/password-reset.service';
import { EmailService } from '../../../../src/modules/email/email.service';

describe('AuthService - Password Reset', () => {
  let service: AuthService;
  let usersService: UsersService;
  let passwordResetService: PasswordResetService;
  let emailService: EmailService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockPasswordResetService = {
    generateResetToken: jest.fn(),
    verifyResetToken: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordReset: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockOtpService = {
    generateOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword',
    isVerified: true,
    disabled: false,
    role: 'USER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    passwordResetService =
      module.get<PasswordResetService>(PasswordResetService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestPasswordReset', () => {
    it('should generate token and send email for existing user', async () => {
      const dto = { email: 'test@example.com' };
      const resetToken = '123456';

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetService.generateResetToken.mockResolvedValue(resetToken);
      mockEmailService.sendPasswordReset.mockResolvedValue(true);

      const result = await service.requestPasswordReset(dto);

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordResetService.generateResetToken).toHaveBeenCalledWith(
        mockUser.email,
      );
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        mockUser.email,
        resetToken,
      );
    });

    it('should return success message even if user does not exist (security)', async () => {
      const dto = { email: 'nonexistent@example.com' };

      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(dto);

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordResetService.generateResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const dto = {
        email: 'test@example.com',
        token: '123456',
        newPassword: 'NewSecurePass123!',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetService.verifyResetToken.mockResolvedValue(true);
      mockUsersService.updatePassword.mockResolvedValue(undefined);

      const result = await service.resetPassword(dto);

      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordResetService.verifyResetToken).toHaveBeenCalledWith(
        dto.email,
        dto.token,
      );
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        dto.newPassword,
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      const dto = {
        email: 'nonexistent@example.com',
        token: '123456',
        newPassword: 'NewSecurePass123!',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(dto)).rejects.toThrow(
        'Invalid or expired reset token',
      );
      expect(passwordResetService.verifyResetToken).not.toHaveBeenCalled();
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is invalid', async () => {
      const dto = {
        email: 'test@example.com',
        token: '000000',
        newPassword: 'NewSecurePass123!',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetService.verifyResetToken.mockResolvedValue(false);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(dto)).rejects.toThrow(
        'Invalid or expired reset token',
      );
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });
  });
});
