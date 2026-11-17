import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { RedisCacheService } from '../cache/redis-cache.service';

const PRODUCTS_LIST_PREFIX = 'cache:products:list:';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly cache: RedisCacheService,
  ) {}

  async findAll(query: QueryProductDto) {
    const {
      search,
      category,
      brand,
      releaseType,
      size,
      sort,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
    } = query;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException('minPrice không được lớn hơn maxPrice');
    }

    const cacheKey = `${PRODUCTS_LIST_PREFIX}${JSON.stringify({
      search: search ?? null,
      category: category ?? null,
      brand: brand ?? null,
      releaseType: releaseType ?? null,
      size: size ?? null,
      sort: sort ?? null,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      page,
      limit,
    })}`;

    const cached = await this.cache.get<{
      data: Product[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);
    if (cached) return cached;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variants');

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }
    if (brand) {
      qb.andWhere('product.brand ILIKE :brand', { brand: `%${brand}%` });
    }
    if (releaseType) {
      qb.andWhere('product.releaseType = :releaseType', { releaseType });
    }
    if (size) {
      qb.andWhere('product.sizes ILIKE :size', { size: `%${size}%` });
    }
    if (search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (sort === 'price_asc') {
      qb.orderBy('product.price', 'ASC');
    } else if (sort === 'price_desc') {
      qb.orderBy('product.price', 'DESC');
    } else {
      qb.orderBy('product.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const result = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    await this.cache.set(cacheKey, result);
    return result;
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['variants'],
    });
    if (!product)
      throw new NotFoundException(`Không tìm thấy sản phẩm id=${id}`);
    return product;
  }

  async findAllActiveWithVariants(): Promise<Product[]> {
    return this.productRepo.find({
      where: { isActive: true },
      relations: ['variants'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepo.create(dto);
    const saved = await this.productRepo.save(product);
    await this.cache.delByPrefix(PRODUCTS_LIST_PREFIX);
    return saved;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    const saved = await this.productRepo.save(product);
    await this.cache.delByPrefix(PRODUCTS_LIST_PREFIX);
    return saved;
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
    await this.cache.delByPrefix(PRODUCTS_LIST_PREFIX);
    return { message: `Đã xóa sản phẩm id=${id} thành công` };
  }

  async findRelated(id: number, limit = 4): Promise<Product[]> {
    const product = await this.findOne(id);
    if (!product.category) return [];

    return this.productRepo
      .createQueryBuilder('product')
      .where('product.category = :category', { category: product.category })
      .andWhere('product.id != :id', { id })
      .andWhere('product.isActive = true')
      .orderBy('RANDOM()')
      .take(limit)
      .getMany();
  }

  async searchForAi(filters: {
    category?: string;
    color?: string;
    style?: string;
    minPrice?: number;
    maxPrice?: number;
    keywords?: string[];
    limit?: number;
  }): Promise<Product[]> {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .where('product.isActive = true')
      .andWhere('product.stock > 0');

    if (filters.category) {
      qb.andWhere('product.category ILIKE :category', {
        category: `%${filters.category}%`,
      });
    }

    if (filters.color) {
      qb.andWhere('product.colors ILIKE :color', {
        color: `%${filters.color}%`,
      });
    }

    if (filters.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    const searchableTerms = [filters.style, ...(filters.keywords ?? [])].filter(
      Boolean,
    ) as string[];

    if (searchableTerms.length > 0) {
      qb.andWhere(
        searchableTerms
          .map(
            (_, idx) =>
              `(product.name ILIKE :term${idx} OR product.description ILIKE :term${idx} OR product.category ILIKE :term${idx})`,
          )
          .join(' OR '),
        Object.fromEntries(
          searchableTerms.map((term, idx) => [`term${idx}`, `%${term}%`]),
        ),
      );
    }

    const limit = filters.limit ?? 20;
    return qb.orderBy('product.createdAt', 'DESC').take(limit).getMany();
  }
}
