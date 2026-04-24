import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User, UserRole } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly cfg: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const hashed = await bcrypt.hash(dto.password, 10);
    const verifyToken = randomUUID();

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      verifyToken,
    });
    await this.userRepo.save(user);
    await this.mailService.sendVerificationEmail(dto.email, verifyToken);

    return {
      message:
        'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findOneBy({ verifyToken: token });
    if (!user) {
      throw new BadRequestException(
        'Token xác thực không hợp lệ hoặc đã hết hạn',
      );
    }

    user.isVerified = true;
    user.verifyToken = null;
    await this.userRepo.save(user);

    return {
      message: 'Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Tài khoản chưa được xác thực. Vui lòng kiểm tra email.',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Chỉ dùng trong môi trường dev để tạo tài khoản admin
  async seedAdmin(secretKey: string) {
    const devSecret = this.cfg.get<string>('ADMIN_SEED_SECRET');
    if (!devSecret || secretKey !== devSecret) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    const email = 'admin@fashionshop.com';
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) return { message: 'Admin đã tồn tại', email };

    const hashed = await bcrypt.hash('Admin@123', 10);
    const admin = this.userRepo.create({
      name: 'Admin',
      email,
      password: hashed,
      role: UserRole.ADMIN,
      isVerified: true,
      verifyToken: null,
    });
    await this.userRepo.save(admin);

    return { message: 'Tạo admin thành công', email, password: 'Admin@123' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    // Không tiết lộ email có tồn tại hay không
    if (!user)
      return {
        message:
          'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      };

    const resetToken = randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await this.userRepo.save(user);

    await this.mailService.sendResetPasswordEmail(dto.email, resetToken);
    return {
      message:
        'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findOneBy({ resetToken: dto.token });
    if (!user || !user.resetTokenExpiry) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    if (user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu lại.');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await this.userRepo.save(user);

    return {
      message:
        'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  logout() {
    return { message: 'Đăng xuất thành công' };
  }
}
