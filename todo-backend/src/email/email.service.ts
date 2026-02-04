import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(
    email: string,
    otp: string,
    name?: string,
  ): Promise<void> {
    console.log(`[EmailService] Attempting to send OTP email to: ${email}`);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to Horizon Tasks',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h1 style="color: #4f46e5;">Horizon Tasks</h1>
            <h2 style="color: #333;">Verify your email address</h2>
            ${name ? `<p>Hello ${name},</p>` : '<p>Hello,</p>'}
            <p>Thank you for signing up! Please verify your email address by entering the 6-digit code below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #4f46e5; color: white; padding: 12px 24px; font-size: 24px; font-weight: bold; border-radius: 5px; display: inline-block; letter-spacing: 5px;">${otp}</div>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
        text: `
        Verify your email address
        
        Hello${name ? ` ${name}` : ''},
        
        Thank you for signing up! Please verify your email address by using this 6-digit code:
        ${otp}
        
        This code will expire in 5 minutes.
        
        If you didn't create an account, you can safely ignore this email.
      `,
      });
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${email}:`, error);
    }
  }
}
