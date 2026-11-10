import { env } from '../../config/env.js';
import type { PaymentProvider } from './payment.provider.js';
import { MockPaymentProvider } from './mock-payment.provider.js';

export const paymentProvider: PaymentProvider = (() => {
  if (env.PAYMENT_PROVIDER === 'mock') return new MockPaymentProvider();
  throw new Error(`Unsupported payment provider: ${env.PAYMENT_PROVIDER}`);
})();
