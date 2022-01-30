import * as t from "io-ts";
import { difference } from "fp-ts/Array";
import * as E from "fp-ts/Either";
import { Eq as EqString } from "fp-ts/string";
import {
  BillingInfoCodec,
  OrderItemCodec,
  ShippingInfoCodec,
  Product,
} from "@domain/data";

export type OrderCreated = {
  id: string;
};

export const UnavailableProductsErrorCodec = t.type({
  type: t.literal("UnavailableProducts"),
  skus: t.array(t.string),
});

export type UnavailableProductsError = t.TypeOf<
  typeof UnavailableProductsErrorCodec
>;

export type CreateOrderResult = E.Either<
  UnavailableProductsError,
  OrderCreated
>;

export const CreateOrderRequest = t.intersection([
  t.type({
    shipping: ShippingInfoCodec,
    items: t.array(OrderItemCodec),
  }),
  t.partial({
    billing: BillingInfoCodec,
  }),
]);
export type CreateOrderRequest = t.TypeOf<typeof CreateOrderRequest>;

export interface Application {
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResult>;
}

export default function createApplication(products: Product[]): Application {
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

    return Promise.resolve(E.right({ id: request.shipping.name }));
  }

  return { createOrder };
}
