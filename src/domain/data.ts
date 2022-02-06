import * as t from "io-ts";
import { nonEmptyArray } from "io-ts-types";
import * as E from "fp-ts/Either";
import BigNumber from "bignumber.js";
import { pipe } from "fp-ts/function";
import { reduce } from "fp-ts/NonEmptyArray";

export const PriceCodec = new t.Type<BigNumber, string, unknown>(
  "PriceCodec",
  (u): u is BigNumber => u instanceof BigNumber,
  (u, c) =>
    pipe(
      t.string.validate(u, c),
      E.chain((s) => {
        const d = new BigNumber(s);
        // BigNumber.prototype.isPositive returns true if 0
        return d.isPositive()
          ? t.success(d)
          : t.failure(u, c, "Must be a non negative decimal number");
      }),
    ),
  (a) => a.toFixed(),
);
export type Price = t.TypeOf<typeof PriceCodec>;

export const VatCodec = t.union([
  t.literal(0),
  t.literal(4),
  t.literal(10),
  t.literal(22),
]);
export type Vat = t.TypeOf<typeof VatCodec>;

export const ProductCodec = t.type({
  gtin: t.string,
  sku: t.string,
  name: t.string,
  brand: t.string,
  category: t.string,
  netUnitPriceInEur: PriceCodec,
  vat: VatCodec,
});
export type Product = t.TypeOf<typeof ProductCodec>;

export const PhoneNumberCodec = t.string;
export const CountryCodeCodec = t.string;
export const PostCodeCodec = t.string;
export const AddressLineCodec = t.string;

export const AddressCodec = t.type({
  countryCode: CountryCodeCodec,
  city: t.string,
  postCode: PostCodeCodec,
  addressLine: AddressLineCodec,
});

export type Address = t.TypeOf<typeof AddressCodec>;

export const ShippingInfoCodec = t.intersection([
  t.type({
    name: t.string,
    address: AddressCodec,
  }),
  t.partial({
    phoneNumber: PhoneNumberCodec,
  }),
]);
export type ShippingInfo = t.TypeOf<typeof ShippingInfoCodec>;

export const BillingInfoCodec = t.partial({
  name: t.string,
  address: AddressCodec,
  phoneNumber: PhoneNumberCodec,
});
export type BillingInfo = t.TypeOf<typeof BillingInfoCodec>;

export const OrderItemCodec = t.intersection([
  ProductCodec,
  t.type({
    quantity: t.number,
  }),
]);
export type OrderItem = t.TypeOf<typeof OrderItemCodec>;

export const UserCodec = t.intersection([
  t.type({
    firstName: t.string,
    lastName: t.string,
  }),
  t.partial({
    email: t.string,
    phoneNumber: PhoneNumberCodec,
  }),
]);

export type User = t.TypeOf<typeof UserCodec>;

export const OrderCodec = t.intersection([
  t.type({
    user: UserCodec,
    shipping: t.type({
      to: ShippingInfoCodec,
      netPriceInEur: PriceCodec,
      vat: VatCodec,
    }),
    items: nonEmptyArray(OrderItemCodec),
  }),
  t.partial({
    billing: BillingInfoCodec,
  }),
]);
export type Order = t.TypeOf<typeof OrderCodec>;

export const OrderAmountCodec = t.type({
  itemsNetSubtotalInEur: PriceCodec,
  itemsVatSubtotalInEur: PriceCodec,
  itemsSubtotalInEur: PriceCodec,
  shippingNetSubtotalInEur: PriceCodec,
  shippingVatSubtotalInEur: PriceCodec,
  shippingSubtotalInEur: PriceCodec,
  orderNetSubtotalInEur: PriceCodec,
  orderVatSubtotalInEur: PriceCodec,
  orderTotalInEur: PriceCodec,
});

export type OrderAmountCodec = t.TypeOf<typeof OrderAmountCodec>;

export function getVatAmountInEur(
  netAmountInEur: BigNumber,
  vat: Vat,
): BigNumber {
  return new BigNumber("0.01").times(vat).times(netAmountInEur);
}

export function getOrderAmount(order: Order): OrderAmountCodec {
  const itemsAmount = {
    netInEur: new BigNumber(0),
    vatInEur: new BigNumber(0),
  };

  return pipe(
    order.items,
    reduce(itemsAmount, (amount, item) => {
      const itemNetAmountInEur = item.netUnitPriceInEur.times(item.quantity);
      const itemVatAmountInEur = getVatAmountInEur(
        itemNetAmountInEur,
        item.vat,
      );
      return {
        netInEur: amount.netInEur.plus(itemNetAmountInEur),
        vatInEur: amount.vatInEur.plus(itemVatAmountInEur),
      };
    }),
    (itemsSubtotal) => {
      const itemsNetSubtotalInEur = itemsSubtotal.netInEur;
      const itemsVatSubtotalInEur = itemsSubtotal.vatInEur;
      const itemsSubtotalInEur = itemsNetSubtotalInEur.plus(
        itemsVatSubtotalInEur,
      );
      const shippingNetSubtotalInEur = order.shipping.netPriceInEur;
      const shippingVatSubtotalInEur = getVatAmountInEur(
        shippingNetSubtotalInEur,
        order.shipping.vat,
      );
      const shippingSubtotalInEur = shippingNetSubtotalInEur.plus(
        shippingVatSubtotalInEur,
      );
      const orderNetSubtotalInEur = itemsNetSubtotalInEur.plus(
        shippingNetSubtotalInEur,
      );
      const orderVatSubtotalInEur = itemsVatSubtotalInEur.plus(
        shippingVatSubtotalInEur,
      );
      const orderTotalInEur = orderNetSubtotalInEur.plus(orderVatSubtotalInEur);

      return {
        itemsNetSubtotalInEur,
        itemsVatSubtotalInEur,
        itemsSubtotalInEur,
        shippingNetSubtotalInEur,
        shippingVatSubtotalInEur,
        shippingSubtotalInEur,
        orderNetSubtotalInEur,
        orderVatSubtotalInEur,
        orderTotalInEur,
      };
    },
  );
}
