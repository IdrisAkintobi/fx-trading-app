import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(
      registerDto.email,
      registerDto.password,
    );

    // Generate and send OTP
    const otp = await this.otpService.generateOtp(user.email);

    // TODO: Send OTP via email
    console.log(`OTP for ${user.email}: ${otp}`);

    return {
      message: 'Registration successful. Please check your email for OTP.',
      userId: user.id,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.disabled) {
      throw new UnauthorizedException('Account has been disabled');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(verifyOtpDto.email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await this.otpService.verifyOtp(
      verifyOtpDto.email,
      verifyOtpDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Verify user
    await this.usersService.verifyUser(user.id);

    return {
      message: 'Email verified successfully',
      ...(await this.generateTokens(user.id, user.email, user.role)),
    };
  }

  async resendOtp(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    const otp = await this.otpService.generateOtp(email);

    // TODO: Send OTP via email
    console.log(`OTP for ${email}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if user still exists and is not disabled
      const user = await this.usersService.findById(payload.sub);

      if (user.disabled) {
        throw new UnauthorizedException('Account has been disabled');
      }

      // Generate new tokens
      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'refresh-secret',
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
          '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
