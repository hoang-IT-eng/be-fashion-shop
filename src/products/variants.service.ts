import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { Product } from './product.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findByProduct(productId: number): Promise<ProductVariant[]> {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product)
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    return this.variantRepo.findBy({ productId });
  }

  async create(
    productId: number,
    dto: CreateVariantDto,
  ): Promise<ProductVariant> {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product)
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${productId}`);
    const variant = this.variantRepo.create({ ...dto, productId });
    return this.variantRepo.save(variant);
  }

  async update(
    productId: number,
    variantId: number,
    dto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOneBy({
      id: variantId,
      productId,
    });
    if (!variant)
      throw new NotFoundException(`Không tìm thấy variant id=${variantId}`);
    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  async remove(
    productId: number,
    variantId: number,
  ): Promise<{ message: string }> {
    const variant = await this.variantRepo.findOneBy({
      id: variantId,
      productId,
    });
    if (!variant)
      throw new NotFoundException(`Không tìm thấy variant id=${variantId}`);
    await this.variantRepo.remove(variant);
    return { message: `Đã xóa variant id=${variantId}` };
  }

  async findById(variantId: number): Promise<ProductVariant> {
    const variant = await this.variantRepo.findOne({
      where: { id: variantId },
      relations: ['product'],
    });
    if (!variant)
      throw new NotFoundException(`Không tìm thấy variant id=${variantId}`);
    return variant;
  }
}
