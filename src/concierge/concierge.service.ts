import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConciergeRequest, ConciergeStatus } from './concierge-request.entity';
import { CreateConciergeDto, ReviewConciergeDto } from './dto/concierge.dto';

@Injectable()
export class ConciergeService {
  constructor(
    @InjectRepository(ConciergeRequest)
    private readonly conciergeRepo: Repository<ConciergeRequest>,
  ) {}

  async create(
    dto: CreateConciergeDto,
    user?: { id: number; name?: string; email?: string },
  ) {
    const marketEstimate = Number((dto.targetPrice * 1.14).toFixed(2));
    const entity = this.conciergeRepo.create({
      userId: user?.id ?? null,
      requesterName:
        dto.requesterName?.trim() || user?.name || 'Guest Collector',
      requesterEmail:
        dto.requesterEmail?.trim() || user?.email || 'collector@enigma.cult',
      itemName: dto.itemName.trim(),
      brand: dto.brand?.trim() ?? null,
      size: dto.size.trim(),
      targetPrice: dto.targetPrice,
      marketEstimate,
      referenceImageUrl: dto.referenceImageUrl ?? null,
      notes: dto.notes ?? null,
      status: ConciergeStatus.PENDING,
    });
    const saved = await this.conciergeRepo.save(entity);
    return this.serialize(saved);
  }

  async findMy(userId: number) {
    const list = await this.conciergeRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return list.map((r) => this.serialize(r));
  }

  async findAll(status?: ConciergeStatus) {
    const list = await this.conciergeRepo.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    return list.map((r) => this.serialize(r));
  }

  async review(id: number, dto: ReviewConciergeDto) {
    const req = await this.conciergeRepo.findOneBy({ id });
    if (!req) {
      throw new NotFoundException(`Concierge request id=${id} not found`);
    }
    req.status = dto.status;
    if (dto.counterOfferPrice !== undefined) {
      req.counterOfferPrice = dto.counterOfferPrice;
    }
    if (dto.adminNotes !== undefined) {
      req.adminNotes = dto.adminNotes;
    }
    const saved = await this.conciergeRepo.save(req);
    return this.serialize(saved);
  }

  private serialize(req: ConciergeRequest) {
    return {
      ...req,
      targetPrice: Number(req.targetPrice),
      marketEstimate:
        req.marketEstimate !== null ? Number(req.marketEstimate) : null,
      counterOfferPrice:
        req.counterOfferPrice !== null ? Number(req.counterOfferPrice) : null,
    };
  }
}
