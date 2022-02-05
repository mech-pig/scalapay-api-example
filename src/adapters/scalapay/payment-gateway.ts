import axios from "axios";
import * as t from "io-ts";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

import { PaymentGateway, CheckoutResult } from "@domain/application";
import { getOrderAmount, getVatAmountInEur, Order } from "@domain/data";

export const SuccessResponseCodec = t.type({
  token: t.string,
  checkoutUrl: t.string,
});

export const ScalapayGatewayConfigCodec = t.type({
  authToken: t.string,
  merchantRedirectSuccessUrl: t.string,
  merchantRedirectCancelUrl: t.string,
  baseUrl: t.string,
  clientTimeoutInMilliseconds: t.Int,
  orderExpirationInMilliseconds: t.Int,
});

export type ScalapayGatewayConfig = t.TypeOf<typeof ScalapayGatewayConfigCodec>;

export type CheckoutConsumerData = {
  givenNames: string;
  surname: string;
  email?: string;
  phoneNumber?: string;
};

export type CheckoutBillingData = {
  name?: string;
  phoneNumber?: string;
  countryCode?: string;
  postcode?: string;
  suburb?: string;
  line1?: string;
};

export type CheckoutShippingData = {
  name: string;
  phoneNumber?: string;
  countryCode: string;
  postcode: string;
  suburb: string;
  line1: string;
};

export type CheckoutRequestData = {
  totalAmount: { amount: string; currency: "EUR" };
  taxAmount: { amount: string; currency: "EUR" };
  shippingAmount: { amount: string; currency: "EUR" };
  consumer: CheckoutConsumerData;
  billing?: CheckoutBillingData;
  shipping: CheckoutShippingData;
  items: {
    sku: string;
    quantity: t.Int;
    name: string;
    gtin: string;
    category: string;
    price: {
      amount: string;
      currency: "EUR";
    };
  }[];
  merchant: {
    redirectCancelUrl: string;
    redirectConfirmUrl: string;
  };
  orderExpiryMilliseconds: t.Int;
};

export default function createScalapayGateway(
  config: ScalapayGatewayConfig,
): PaymentGateway {
  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.clientTimeoutInMilliseconds,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.authToken}`,
    },
  });

  async function checkout(order: Order): Promise<CheckoutResult> {
    const orderAmount = getOrderAmount(order);
    const requestData: CheckoutRequestData = {
      totalAmount: {
        amount: orderAmount.orderTotalInEur.toFixed(),
        currency: "EUR",
      },
      taxAmount: {
        amount: orderAmount.orderVatSubtotalInEur.toFixed(),
        currency: "EUR",
      },
      shippingAmount: {
        amount: orderAmount.shippingSubtotalInEur.toFixed(),
        currency: "EUR",
      },
      consumer: {
        givenNames: order.user.firstName,
        surname: order.user.lastName,
        ...(order.user.email ? { email: order.user.email } : {}),
        ...(order.user.phoneNumber
          ? { phoneNumber: order.user.phoneNumber }
          : {}),
      },
      ...(order.billing
        ? {
            billing: {
              ...(order.billing.name ? { name: order.billing.name } : {}),
              ...(order.billing.phoneNumber
                ? { phoneNumber: order.billing.phoneNumber }
                : {}),
              ...(order.billing.address
                ? {
                    countryCode: order.billing.address.countryCode,
                    suburb: order.billing.address.city,
                    postcode: order.billing.address.postCode,
                    line1: order.billing.address.addressLine,
                  }
                : {}),
            },
          }
        : {}),
      shipping: {
        ...(order.shipping.to.phoneNumber
          ? { phoneNumber: order.shipping.to.phoneNumber }
          : {}),
        countryCode: order.shipping.to.address.countryCode,
        name: order.shipping.to.name,
        postcode: order.shipping.to.address.postCode,
        suburb: order.shipping.to.address.city,
        line1: order.shipping.to.address.addressLine,
      },
      items: order.items.map((item) => ({
        sku: item.sku,
        quantity: item.quantity as t.Int,
        name: item.name,
        gtin: item.gtin,
        category: item.category,
        price: {
          amount: item.netUnitPriceInEur
            .plus(getVatAmountInEur(item.netUnitPriceInEur, item.vat))
            .toFixed(),
          currency: "EUR",
        },
      })),
      merchant: {
        redirectCancelUrl: config.merchantRedirectCancelUrl,
        redirectConfirmUrl: config.merchantRedirectSuccessUrl,
      },
      orderExpiryMilliseconds: config.orderExpirationInMilliseconds,
    };

    return client.post("/v2/orders", requestData).then((response) =>
      pipe(
        SuccessResponseCodec.decode(response.data),
        E.map(({ checkoutUrl }) => ({ redirectUrl: checkoutUrl })),
        E.mapLeft((_) => ({ type: "PaymentGatewayError" })),
      ),
    );
  }

  return { checkout };
}
