import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VouchersService } from './vouchers.service';
import { Voucher } from './voucher.entity';

describe('VouchersService', () => {
  let service: VouchersService;
  let voucherRepo: jest.Mocked<Partial<Repository<Voucher>>>;

  beforeEach(() => {
    voucherRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((dto: Partial<Voucher>) => dto as Voucher),
    };
    service = new VouchersService(voucherRepo as Repository<Voucher>);
  });

  it('validates secret initiation reward ENIGMA15 even before DB seed', async () => {
    const res = await service.validate('enigma15', 10000000);
    expect(res.valid).toBe(true);
    expect(res.code).toBe('ENIGMA15');
    expect(res.isSecretInitiation).toBe(true);
    expect(res.discountAmount).toBe(1500000);
    expect(res.finalTotal).toBe(8500000);
  });

  it('rejects unknown voucher codes', async () => {
    await expect(service.validate('INVALID99', 1000000)).rejects.toThrow(
      BadRequestException,
    );
  });
});
