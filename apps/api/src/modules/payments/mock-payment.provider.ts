import { randomUUID } from 'node:crypto';
import type { PaymentProvider, ProviderPaymentResult } from './payment.provider.js';
import type { MockPaymentMethod } from './payment.validation.js';

const outcomes = new Map<string, ProviderPaymentResult>();

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: {
    amount: string;
    currency: string;
    paymentMethod: MockPaymentMethod;
  }) {
    const reference = `mock_${randomUUID()}`;
    const outcome =
      input.paymentMethod === 'mock_failure'
        ? { outcome: 'FAILED' as const, failureReason: 'Mock payment was declined.' }
        : input.paymentMethod === 'mock_cancel'
          ? { outcome: 'CANCELLED' as const, failureReason: 'Mock payment was cancelled.' }
          : { outcome: 'SUCCESS' as const };
    outcomes.set(reference, { reference, ...outcome });
    return { reference };
  }

  async verifyPayment(reference: string) {
    const result = outcomes.get(reference);
    if (!result) throw new Error('Payment reference was not found.');
    return result;
  }

  async handleFailure(reference: string, reason: string) {
    const result = { reference, outcome: 'FAILED' as const, failureReason: reason };
    outcomes.set(reference, result);
    return result;
  }

  async refundPayment(reference: string) {
    return { reference: `refund_${reference}` };
  }
}
