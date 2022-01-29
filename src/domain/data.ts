import * as t from "io-ts";

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

export const OrderCodec = t.intersection([
  t.type({
    shipping: ShippingInfoCodec,
  }),
  t.partial({
    billing: BillingInfoCodec,
  }),
]);
export type Order = t.TypeOf<typeof OrderCodec>;
