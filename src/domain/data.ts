import * as t from "io-ts";
import { nonEmptyArray } from "io-ts-types";
import * as E from "fp-ts/Either";
import BigNumber from "bignumber.js";
import { pipe } from "fp-ts/function";

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

export const ProductCodec = t.type({
  gtin: t.string,
  sku: t.string,
  name: t.string,
  brand: t.string,
  category: t.string,
  unitPriceInEur: PriceCodec,
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

export const OrderItemCodec = t.type({
  sku: t.string,
  gtin: t.string,
  name: t.string,
  brand: t.string,
  category: t.string,
  quantity: t.number,
  netPriceInEur: PriceCodec,
});
export type OrderItem = t.TypeOf<typeof OrderItemCodec>;

export const OrderCodec = t.intersection([
  t.type({
    shipping: ShippingInfoCodec,
    items: nonEmptyArray(OrderItemCodec),
  }),
  t.partial({
    billing: BillingInfoCodec,
  }),
]);
export type Order = t.TypeOf<typeof OrderCodec>;
