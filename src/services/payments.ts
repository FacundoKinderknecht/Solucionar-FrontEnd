import { getJSON, postJSON } from "./api";

export type InitiateResponse = { payment_id: number; payment_url: string; external_reference: string };

export const createPayment = (payload: unknown) => postJSON<any>("/payments/", payload);
export const initiatePayment = (paymentId: number) => postJSON<InitiateResponse>(`/payments/${paymentId}/initiate`, {});
export const completePayment = (paymentId: number) => postJSON<any>(`/payments/${paymentId}/complete`, {});
export const getPayment = (paymentId: number) => getJSON<any>(`/payments/${paymentId}`);

export const listMyPayments = () => getJSON<any[]>('/payments/my-payments');
