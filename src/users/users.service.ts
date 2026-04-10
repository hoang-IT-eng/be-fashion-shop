import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Seed dữ liệu nhóm khi khởi động (chỉ chạy nếu bảng trống)
  async onModuleInit() {
    // Seed removed: users now register via /auth/register with email + password
  }

  // ── READ ──────────────────────────────────────────────
  findAll(): Promise<User[]> {
    return this.userRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`Không tìm thấy user với id=${id}`);
    return user;
  }

  // ── CREATE ────────────────────────────────────────────
  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }

  // ── UPDATE ────────────────────────────────────────────
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id); // throws 404 if not found
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  // ── DELETE ────────────────────────────────────────────
  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id); // throws 404 if not found
    await this.userRepository.remove(user);
    return { message: `Đã xóa user id=${id} thành công` };
  }
}
