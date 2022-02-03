import * as t from "io-ts";
import { nonEmptyArray } from "io-ts-types";
import * as E from "fp-ts/Either";
import { NonEmptyArray, reduce } from "fp-ts/NonEmptyArray";
import { pipe } from "fp-ts/function";

import {
  BillingInfoCodec,
  ShippingInfoCodec,
  Product,
  Order,
  OrderItem,
  UserCodec,
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
    user: UserCodec,
    shipping: ShippingInfoCodec,
    items: nonEmptyArray(t.type({ sku: t.string, quantity: t.number })),
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
    const requestedItems = pipe(
      request.items,
      reduce(
        {
          orderItems: [] as OrderItem[],
          productNotFoundSkus: [] as string[],
        },
        (acc, item) => {
          const product = products.find((p) => p.sku === item.sku);
          return product
            ? {
                ...acc,
                orderItems: [
                  ...acc.orderItems,
                  {
                    sku: product.sku,
                    name: product.name,
                    gtin: product.gtin,
                    category: product.category,
                    brand: product.brand,
                    quantity: item.quantity,
                    netPriceInEur: product.unitPriceInEur.times(item.quantity),
                  },
                ],
              }
            : {
                ...acc,
                productNotFoundSkus: [...acc.productNotFoundSkus, item.sku],
              };
        },
      ),
    );

    if (requestedItems.productNotFoundSkus.length > 0) {
      return Promise.resolve(
        E.left({
          type: "UnavailableProducts",
          skus: requestedItems.productNotFoundSkus,
        }),
      );
    }

    const order: Order = {
      ...request,
      items: requestedItems.orderItems as NonEmptyArray<OrderItem>,
    };

    return paymentGateway
      .startPayment(order)
      .then(
        E.map((result) => ({ paymentGatewayRedirectUrl: result.redirectUrl })),
      );
  }

  return { createOrder };
}
