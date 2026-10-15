import type { PaymentProviderId } from "../../domain/payment.ts";

export type CreateGatewayOrder = {
  amountPaise: number;
  currency: "INR";
  receipt: string;
  notes: Record<string, string>;
};

export type GatewayOrder = {
  id: string;
  amountPaise: number;
  currency: string;
};

export type GatewayPayment = {
  id: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  status: string;
};

export type CreateGatewayRefund = {
  paymentId: string;
  amountPaise: number;
  receipt: string;
  idempotencyKey: string;
};

export type GatewayRefund = {
  id: string;
};

export type PaymentGateway = {
  readonly id: PaymentProviderId;
  readonly checkoutKeyId: string;
  createOrder(input: CreateGatewayOrder): Promise<GatewayOrder>;
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  createRefund(input: CreateGatewayRefund): Promise<GatewayRefund>;
};
