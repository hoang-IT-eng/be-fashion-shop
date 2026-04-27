import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
  ReturnQueryFromVNPay,
  VerifyReturnUrl,
  HashAlgorithm,
} from 'vnpay';

@Injectable()
export class VnpayService {
  private vnpay: VNPay;

  constructor(private readonly cfg: ConfigService) {
    this.vnpay = new VNPay({
      tmnCode: cfg.get<string>('VNPAY_TMN_CODE') as string,
      secureSecret: cfg.get<string>('VNPAY_HASH_SECRET') as string,
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
      loggerFn: ignoreLogger,
    });
  }

  createPaymentUrl(orderId: number, amount: number, ipAddr: string): string {
    const paymentUrl = this.vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: this.cfg.get<string>('VNPAY_RETURN_URL') as string,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000)),
    });
    return paymentUrl;
  }

  verifyReturn(query: ReturnQueryFromVNPay): VerifyReturnUrl {
    return this.vnpay.verifyReturnUrl(query);
  }
}
