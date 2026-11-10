import type { MockPaymentMethod } from './payment.validation.js';

export type ProviderPaymentResult = {
  reference: string;
  outcome: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  failureReason?: string;
};

export interface PaymentProvider {
  createPayment(input: {
    amount: string;
    currency: string;
    paymentMethod: MockPaymentMethod;
  }): Promise<{ reference: string }>;
  verifyPayment(reference: string): Promise<ProviderPaymentResult>;
  handleFailure(reference: string, reason: string): Promise<ProviderPaymentResult>;
  refundPayment(reference: string, amount: string): Promise<{ reference: string }>;
}
