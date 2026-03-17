import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOtp(email: string, otp: string): Promise<boolean> {
    try {
      this.logger.log(`Attempting to send OTP email to ${email}`);

      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Your OTP Verification Code',
        text: `Your OTP verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your OTP verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">This code will expire in 10 minutes.</p>
            <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`OTP email sent successfully to ${email}`);
      this.logger.debug(`Email response: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send OTP email to ${email}: ${error.message}`,
      );
      this.logger.error(`Error details:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      this.logger.log(`Attempting to send welcome email to ${email}`);

      const result = await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to FX Trading App',
        text: `Hi ${name},\n\nWelcome to FX Trading App! Your email has been verified successfully.\n\nYou can now start funding your wallet and trading currencies.\n\nBest regards,\nFX Trading Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to FX Trading App!</h2>
            <p>Hi ${name},</p>
            <p>Your email has been verified successfully.</p>
            <p>You can now start:</p>
            <ul>
              <li>Funding your multi-currency wallet</li>
              <li>Trading between different currencies</li>
              <li>Tracking your transaction history</li>
            </ul>
            <p>Best regards,<br/>FX Trading Team</p>
          </div>
        `,
      });

      this.logger.log(`Welcome email sent successfully to ${email}`);
      this.logger.debug(`Email response: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}: ${error.message}`,
      );
      this.logger.error(`Error details:`, error);
      return false;
    }
  }
}
