import * as t from "io-ts";
import { nonEmptyArray } from "io-ts-types";
import { difference } from "fp-ts/Array";
import * as E from "fp-ts/Either";
import { Eq as EqString } from "fp-ts/string";
import {
  BillingInfoCodec,
  OrderItemCodec,
  ShippingInfoCodec,
  Product,
  Order,
} from "@domain/data";

export type OrderCreated = {
  paymentGatewayRedirectUrl: string;
};

export const UnavailableProductsErrorCodec = t.type({
  type: t.literal("UnavailableProducts"),
  skus: t.array(t.string),
});

export type UnavailableProductsError = t.TypeOf<
  typeof UnavailableProductsErrorCodec
>;

export type CreateOrderResult = E.Either<
  UnavailableProductsError | PaymentGatewayError,
  OrderCreated
>;

export const CreateOrderRequest = t.intersection([
  t.type({
    shipping: ShippingInfoCodec,
    items: nonEmptyArray(OrderItemCodec),
  }),
  t.partial({
    billing: BillingInfoCodec,
  }),
]);
export type CreateOrderRequest = t.TypeOf<typeof CreateOrderRequest>;

export interface Application {
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResult>;
}

export const PaymentGatewayErrorCodec = t.type({
  type: t.literal("PaymentGatewayError"),
});
export type PaymentGatewayError = t.TypeOf<typeof PaymentGatewayErrorCodec>;

export const PaymentStartedCodec = t.type({ redirectUrl: t.string });
export type PaymentStarted = t.TypeOf<typeof PaymentStartedCodec>;

export type StartPaymentResult = E.Either<PaymentGatewayError, PaymentStarted>;

export interface PaymentGateway {
  startPayment(order: Order): Promise<StartPaymentResult>;
}

export default function createApplication(
  products: Product[],
  paymentGateway: PaymentGateway,
): Application {
  async function createOrder(
    request: CreateOrderRequest,
  ): Promise<CreateOrderResult> {
    const requestedProductSkus = request.items.map((p) => p.sku);
    const unavailableProductSkus = difference(EqString)(
      requestedProductSkus,
      products.map((p) => p.sku),
    );
    if (unavailableProductSkus.length > 0) {
      return Promise.resolve(
        E.left({ type: "UnavailableProducts", skus: unavailableProductSkus }),
      );
    }
    const order: Order = { ...request };
    return paymentGateway
      .startPayment(order)
      .then(
        E.map((result) => ({ paymentGatewayRedirectUrl: result.redirectUrl })),
      );
  }

  return { createOrder };
}
