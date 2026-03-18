import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PasswordResetService } from '../../../../src/modules/auth/password-reset.service';
import { RedisService } from '../../../../src/modules/redis/redis.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let redisService: RedisService;
  let configService: ConfigService;

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResetToken', () => {
    it('should generate and store a reset token', async () => {
      const email = 'test@example.com';
      mockConfigService.get
        .mockReturnValueOnce(600) // PASSWORD_RESET_TOKEN_EXPIRATION_SEC
        .mockReturnValueOnce(6); // PASSWORD_RESET_TOKEN_LENGTH
      mockRedisService.set.mockResolvedValue('OK');

      const token = await service.generateResetToken(email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(6); // 6 digit code
      expect(/^\d{6}$/.test(token)).toBe(true); // Should be all digits
      expect(configService.get).toHaveBeenCalledWith(
        'PASSWORD_RESET_TOKEN_EXPIRATION_SEC',
        600,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'PASSWORD_RESET_TOKEN_LENGTH',
        6,
      );
      expect(redisService.set).toHaveBeenCalledWith(
        `password_reset:${email}`,
        expect.any(String),
        600,
      );
    });
  });

  describe('verifyResetToken', () => {
    it('should verify a valid reset token', async () => {
      const email = 'test@example.com';
      const token = '123456';

      // Mock Redis to return a hashed token that matches
      const hashedToken = createHash('sha256').update(token).digest('hex');

      mockRedisService.get.mockResolvedValue(hashedToken);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.verifyResetToken(email, token);

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith(`password_reset:${email}`);
      expect(redisService.del).toHaveBeenCalledWith(`password_reset:${email}`);
    });

    it('should return false for invalid token', async () => {
      const email = 'test@example.com';
      const token = '123456';
      const wrongHashedToken = 'wrong_hash';

      mockRedisService.get.mockResolvedValue(wrongHashedToken);

      const result = await service.verifyResetToken(email, token);

      expect(result).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith(`password_reset:${email}`);
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should return false if token not found in Redis', async () => {
      const email = 'test@example.com';
      const token = '123456';

      mockRedisService.get.mockResolvedValue(null);

      const result = await service.verifyResetToken(email, token);

      expect(result).toBe(false);
      expect(redisService.get).toHaveBeenCalledWith(`password_reset:${email}`);
      expect(redisService.del).not.toHaveBeenCalled();
    });
  });

  describe('deleteResetToken', () => {
    it('should delete reset token from Redis', async () => {
      const email = 'test@example.com';
      mockRedisService.del.mockResolvedValue(1);

      await service.deleteResetToken(email);

      expect(redisService.del).toHaveBeenCalledWith(`password_reset:${email}`);
    });
  });
});
