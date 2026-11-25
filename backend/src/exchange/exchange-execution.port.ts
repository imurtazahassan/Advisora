export const EXCHANGE_EXECUTION_PORT = 'EXCHANGE_EXECUTION_PORT';

export type SimulatedOrderRequest = { symbol: string; quoteAmount: number; referencePrice: number; idempotencyKey: string };
export type SimulatedOrderResult = { quantity: number; price: number; quoteAmount: number; executionMode: 'SIMULATED'; externalOrderId: string };

export interface ExchangeExecutionPort {
  submitOrder(request: SimulatedOrderRequest): Promise<SimulatedOrderResult>;
}
