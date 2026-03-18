import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async generateResetToken(email: string): Promise<string> {
    const resetTokenExpirationSec = this.configService.get<number>(
      'PASSWORD_RESET_TOKEN_EXPIRATION_SEC',
      600,
    ); // Default 10 minutes

    const resetTokenLength = this.configService.get<number>(
      'PASSWORD_RESET_TOKEN_LENGTH',
      6,
    );

    // Generate random numeric token (same as OTP)
    const token = Array.from({ length: resetTokenLength }, () =>
      randomInt(0, 10),
    ).join('');

    // Hash the token before storing
    const hashedToken = this.hashToken(token);

    // Store in Redis with TTL
    const redisKey = this.getRedisKey(email);
    await this.redisService.set(redisKey, hashedToken, resetTokenExpirationSec);

    // Return plain token to send via email
    return token;
  }

  async verifyResetToken(email: string, token: string): Promise<boolean> {
    const redisKey = this.getRedisKey(email);
    const storedHashedToken = await this.redisService.get(redisKey);

    if (!storedHashedToken) {
      return false;
    }

    const hashedInputToken = this.hashToken(token);

    if (hashedInputToken === storedHashedToken) {
      // Delete token after successful verification
      await this.redisService.del(redisKey);
      return true;
    }

    return false;
  }

  async deleteResetToken(email: string): Promise<void> {
    const redisKey = this.getRedisKey(email);
    await this.redisService.del(redisKey);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRedisKey(email: string): string {
    return `password_reset:${email}`;
  }
}
