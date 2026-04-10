import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private cfg: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cfg.get<string>('MAIL_USER'),
        pass: cfg.get<string>('MAIL_PASS'), // Gmail App Password
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const appUrl = this.cfg.get<string>('APP_URL', 'http://localhost:3000');
    const verifyUrl = `${appUrl}/auth/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: `"Fashion Shop" <${this.cfg.get('MAIL_USER')}>`,
      to,
      subject: 'Xác thực tài khoản Fashion Shop',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #eee;border-radius:12px">
          <h2 style="color:#7a5aff">Fashion Shop</h2>
          <p>Cảm ơn bạn đã đăng ký. Vui lòng xác thực email bằng cách nhấn nút bên dưới:</p>
          <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7a5aff;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
            Xác thực Email
          </a>
          <p style="color:#888;font-size:13px">Link có hiệu lực trong 24 giờ. Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
        </div>
      `,
    });
  }
}
