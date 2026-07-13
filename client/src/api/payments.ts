import api from '../lib/axios'

export const paymentApi = {
  createOrder: (eventId: string, partnerId?: string) =>
    api.post<{ orderId: string; amount: number; currency: string; keyId: string }>(
      '/payments/create-order',
      { eventId, partnerId }
    ).then(r => r.data),

  verify: (data: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
    eventId: string
    partnerId?: string
  }) => api.post('/payments/verify', data).then(r => r.data),
}
