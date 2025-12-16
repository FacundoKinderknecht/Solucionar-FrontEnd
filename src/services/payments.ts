import { getJSON, postJSON } from "./api";

export type PaymentGateway = "MERCADOPAGO" | "CREDIT_CARD" | "DEBIT_CARD" | "TRANSFER";
export type PaymentStatus = "initialized" | "pending" | "completed" | "failed";
export type TransactionStatus = "approved" | "rejected" | "pending" | "other";

export type PaymentBase = {
	reservation_id: number | null;
	client_id: number | null;
	service_id: number | null;
	reservation_datetime: string | null;
	notes: string | null;
	gateway: PaymentGateway | null;
	monto: number | null;
	moneda: string;
	comision: number | null;
	neto: number | null;
	external_reference: string | null;
};

export type Payment = PaymentBase & {
	id: number;
	estado: PaymentStatus;
	creado_en: string | null;
	actualizado_en: string | null;
	transaction_id?: string | null;
	transaction_status?: TransactionStatus | null;
	gateway_response?: Record<string, unknown> | null;
};

export type CreatePaymentPayload = {
	service_id: number;
	reservation_datetime: string;
	gateway: PaymentGateway;
	notes?: string;
	monto?: number;
	moneda?: string;
	comision?: number;
	neto?: number;
};

export type InitiateResponse = { payment_id: number; payment_url: string; external_reference: string };

export const createPayment = (payload: CreatePaymentPayload) => postJSON<Payment>("/payments/", payload);
export const initiatePayment = (paymentId: number) => postJSON<InitiateResponse>(`/payments/${paymentId}/initiate`, {});
export const completePayment = (paymentId: number) => postJSON<Payment>(`/payments/${paymentId}/complete`, {});
export const getPayment = (paymentId: number) => getJSON<Payment>(`/payments/${paymentId}`);

export const listMyPayments = () => getJSON<Payment[]>("/payments/my-payments");
