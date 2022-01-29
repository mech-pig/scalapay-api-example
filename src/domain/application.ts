import * as t from "io-ts";
import { BillingInfoCodec, ShippingInfoCodec } from "@domain/data";

export type OrderCreated = {
  id: string;
};

export const CreateOrderRequest = t.intersection([
  t.type({
    shipping: ShippingInfoCodec,
  }),
  t.partial({
    billing: BillingInfoCodec,
  }),
]);
export type CreateOrderRequest = t.TypeOf<typeof CreateOrderRequest>;

export interface Application {
  createOrder(request: CreateOrderRequest): Promise<OrderCreated>;
}

export default function createApplication(): Application {
  async function createOrder(
    request: CreateOrderRequest,
  ): Promise<OrderCreated> {
    return Promise.resolve({ id: request.shipping.name });
  }

  return { createOrder };
}
