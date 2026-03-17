import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { createHash, randomInt } from 'node:crypto';

@Injectable()
export class OtpService {
  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async generateOtp(email: string): Promise<string> {
    const otpLength = this.configService.get<number>('OTP_LENGTH', 6);
    const otpExpirationSec = this.configService.get<number>(
      'OTP_EXPIRATION_SEC',
      600,
    );

    // Generate random OTP
    const code = Array.from({ length: otpLength }, () => randomInt(0, 10)).join(
      '',
    );

    // Hash the OTP before storing
    const hashedOtp = this.hashOtp(code);

    // Store in Redis with TTL
    const redisKey = this.getRedisKey(email);
    await this.redisService.set(redisKey, hashedOtp, otpExpirationSec);

    // Return plain OTP to send via email
    return code;
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const redisKey = this.getRedisKey(email);
    const storedHashedOtp = await this.redisService.get(redisKey);

    if (!storedHashedOtp) {
      return false;
    }

    const hashedInputOtp = this.hashOtp(code);

    if (hashedInputOtp === storedHashedOtp) {
      // Delete OTP after successful verification
      await this.redisService.del(redisKey);
      return true;
    }

    return false;
  }

  async deleteOtp(email: string): Promise<void> {
    const redisKey = this.getRedisKey(email);
    await this.redisService.del(redisKey);
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private getRedisKey(email: string): string {
    return `otp:${email}`;
  }
}
