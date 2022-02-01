import * as E from "fp-ts/Either";
import { PaymentGateway } from "@domain/application";
import { Order } from "@domain/data";

export default function createMockPaymentGateway(): PaymentGateway {
  return {
    startPayment: (order: Order) =>
      Promise.resolve(E.right({ redirectUrl: order.shipping.name })),
  };
}
