import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ExchangeExecutionPort, SimulatedOrderRequest, SimulatedOrderResult } from './exchange-execution.port';

/** Coursework adapter only. It never connects to an exchange or transmits an order. */
@Injectable()
export class SimulatedExchangeExecutionAdapter implements ExchangeExecutionPort {
  async submitOrder(request: SimulatedOrderRequest): Promise<SimulatedOrderResult> {
    if (!request.symbol || !Number.isFinite(request.quoteAmount) || request.quoteAmount <= 0 || !Number.isFinite(request.referencePrice) || request.referencePrice <= 0 || !request.idempotencyKey) {
      throw new Error('Invalid simulated order request.');
    }
    return {
      quantity: request.quoteAmount / request.referencePrice,
      price: request.referencePrice,
      quoteAmount: request.quoteAmount,
      executionMode: 'SIMULATED',
      externalOrderId: `SIM-${randomUUID()}`,
    };
  }
}
