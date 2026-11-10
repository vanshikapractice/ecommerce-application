import { MockPaymentProvider } from '../src/modules/payments/mock-payment.provider.js';

describe('mock payment provider', () => {
  it.each([
    ['mock_card', 'SUCCESS'],
    ['mock_failure', 'FAILED'],
    ['mock_cancel', 'CANCELLED'],
  ] as const)('controls the simulated %s outcome', async (paymentMethod, expected) => {
    const provider = new MockPaymentProvider();
    const created = await provider.createPayment({
      amount: '100.00',
      currency: 'INR',
      paymentMethod,
    });

    const result = await provider.verifyPayment(created.reference);

    expect(result.outcome).toBe(expected);
    expect(result.reference).toBe(created.reference);
  });

  it('rejects unknown provider references', async () => {
    const provider = new MockPaymentProvider();
    await expect(provider.verifyPayment('missing-reference')).rejects.toThrow(
      'Payment reference was not found.',
    );
  });
});
