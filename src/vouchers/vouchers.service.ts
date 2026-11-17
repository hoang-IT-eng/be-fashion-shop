import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountType, Voucher } from './voucher.entity';
import { CreateVoucherDto, UpdateVoucherDto } from './dto/voucher.dto';

export interface VoucherValidationResult {
  valid: boolean;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  finalTotal: number;
  isSecretInitiation: boolean;
  message: string;
}

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
  ) {}

  async validate(
    rawCode: string,
    subtotal: number,
  ): Promise<VoucherValidationResult> {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Voucher code cannot be empty');
    }

    let voucher = await this.voucherRepo.findOneBy({ code });

    // Built-in Secret Initiation fallback for ENIGMA15 if DB isn't seeded yet
    if (!voucher && code === 'ENIGMA15') {
      voucher = this.voucherRepo.create({
        code: 'ENIGMA15',
        description: 'Inner Circle Initiation — 15% Privilege',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        minOrderAmount: 0,
        maxDiscountAmount: 2500000,
        usageLimit: 9999,
        usedCount: 0,
        isSecretInitiation: true,
        expiresAt: null,
        isActive: true,
      });
    }

    if (!voucher || !voucher.isActive) {
      throw new BadRequestException(`Voucher "${code}" is invalid or inactive`);
    }

    if (
      voucher.expiresAt &&
      new Date(voucher.expiresAt).getTime() < Date.now()
    ) {
      throw new BadRequestException(`Voucher "${code}" has expired`);
    }

    if (voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException(
        `Voucher "${code}" has reached its allocation limit`,
      );
    }

    const minOrder = Number(voucher.minOrderAmount || 0);
    if (subtotal < minOrder) {
      throw new BadRequestException(
        `Minimum order subtotal of ${minOrder} required for "${code}"`,
      );
    }

    const discountVal = Number(voucher.discountValue);
    let discountAmount =
      voucher.discountType === DiscountType.PERCENTAGE
        ? (subtotal * discountVal) / 100
        : discountVal;

    if (
      voucher.maxDiscountAmount !== null &&
      voucher.maxDiscountAmount !== undefined
    ) {
      discountAmount = Math.min(
        discountAmount,
        Number(voucher.maxDiscountAmount),
      );
    }
    discountAmount = Math.min(subtotal, Number(discountAmount.toFixed(2)));
    const finalTotal = Number(
      Math.max(0, subtotal - discountAmount).toFixed(2),
    );

    return {
      valid: true,
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: discountVal,
      discountAmount,
      finalTotal,
      isSecretInitiation: voucher.isSecretInitiation,
      message: voucher.isSecretInitiation
        ? 'Inner Circle Initiation verified — 15% privilege unlocked.'
        : `Applied ${voucher.code} (-${discountAmount.toLocaleString('en-US')})`,
    };
  }

  async incrementUsageIfExists(code: string): Promise<void> {
    const normalized = code.trim().toUpperCase();
    const voucher = await this.voucherRepo.findOneBy({ code: normalized });
    if (voucher) {
      await this.voucherRepo.increment({ id: voucher.id }, 'usedCount', 1);
    }
  }

  async findPublic() {
    const list = await this.voucherRepo.find({
      where: { isActive: true, isSecretInitiation: false },
      order: { createdAt: 'DESC' },
    });
    return list.map((v) => this.serialize(v));
  }

  async findAll() {
    const list = await this.voucherRepo.find({
      order: { createdAt: 'DESC' },
    });
    return list.map((v) => this.serialize(v));
  }

  async create(dto: CreateVoucherDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.voucherRepo.findOneBy({ code });
    if (existing) {
      throw new ConflictException(`Voucher "${code}" already exists`);
    }
    const entity = this.voucherRepo.create({
      ...dto,
      code,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      usageLimit: dto.usageLimit ?? 500,
      isSecretInitiation: dto.isSecretInitiation ?? false,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.voucherRepo.save(entity);
    return this.serialize(saved);
  }

  async update(id: number, dto: UpdateVoucherDto) {
    const voucher = await this.voucherRepo.findOneBy({ id });
    if (!voucher) throw new NotFoundException(`Voucher id=${id} not found`);
    if (dto.code !== undefined) voucher.code = dto.code.trim().toUpperCase();
    if (dto.description !== undefined) voucher.description = dto.description;
    if (dto.discountType !== undefined) voucher.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      voucher.discountValue = dto.discountValue;
    if (dto.minOrderAmount !== undefined)
      voucher.minOrderAmount = dto.minOrderAmount;
    if (dto.maxDiscountAmount !== undefined)
      voucher.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.usageLimit !== undefined) voucher.usageLimit = dto.usageLimit;
    if (dto.isSecretInitiation !== undefined)
      voucher.isSecretInitiation = dto.isSecretInitiation;
    if (dto.expiresAt !== undefined)
      voucher.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) voucher.isActive = dto.isActive;
    const saved = await this.voucherRepo.save(voucher);
    return this.serialize(saved);
  }

  async remove(id: number) {
    const voucher = await this.voucherRepo.findOneBy({ id });
    if (!voucher) throw new NotFoundException(`Voucher id=${id} not found`);
    await this.voucherRepo.remove(voucher);
    return { message: `Deleted voucher id=${id}` };
  }

  private serialize(v: Voucher) {
    return {
      ...v,
      discountValue: Number(v.discountValue),
      minOrderAmount: Number(v.minOrderAmount),
      maxDiscountAmount:
        v.maxDiscountAmount !== null ? Number(v.maxDiscountAmount) : null,
    };
  }
}
