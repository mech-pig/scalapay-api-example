import { Int } from "io-ts";
import * as E from "fp-ts/Either";
import axios from "axios";
import BigNumber from "bignumber.js";

import createScalapayGateway, {
  ScalapayGatewayConfig,
  CheckoutRequestData,
  CheckoutBillingData,
  CheckoutConsumerData,
  CheckoutShippingData,
} from "@adapters/scalapay/payment-gateway";
import { Order } from "@domain/data";

import { omit } from "../../utils";

jest.mock("axios");

const makeTestConfig = (
  overrides: Partial<ScalapayGatewayConfig> = {},
): ScalapayGatewayConfig => ({
  authToken: "test-token",
  merchantRedirectSuccessUrl: "http://test.dev/success",
  merchantRedirectCancelUrl: "http://test.dev/failure",
  baseUrl: "https://dummy.scalapay.com",
  clientTimeoutInMilliseconds: 3000 as Int,
  orderExpirationInMilliseconds: (1000 * 60) as Int,
  ...overrides,
});

const fullOrder = {
  user: {
    firstName: "user.firstName.test",
    lastName: "user.lastName.test",
    phoneNumber: "+1 2345 6789",
    email: "user.email@test.com",
  },
  billing: {
    name: "billing.test",
    address: {
      countryCode: "US",
      city: "Big City",
      postCode: "00000",
      addressLine: "2nd Some Street",
    },
    phoneNumber: "+2 3456 7890",
  },
  shipping: {
    name: "test",
    address: {
      countryCode: "IT",
      city: "Milano",
      postCode: "20100",
      addressLine: "Vicolo Stretto, 1",
    },
    phoneNumber: "+3 4567 8901",
  },
  items: [
    {
      sku: "1",
      name: "product-1",
      gtin: "1400939035767",
      brand: "acme",
      category: "electronic",
      netPriceInEur: new BigNumber("18.54"),
      quantity: 2,
    },
    {
      sku: "2",
      name: "product-2",
      gtin: "2400939035766",
      brand: "acme2",
      category: "home",
      netPriceInEur: new BigNumber("3.33"),
      quantity: 3,
    },
  ],
};

describe("createScalapayGateway", () => {
  test("axios instance is configured", () => {
    const config = makeTestConfig();
    createScalapayGateway(config);
    expect(axios.create).toBeCalledWith({
      baseURL: config.baseUrl,
      timeout: config.clientTimeoutInMilliseconds,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.authToken}`,
      },
    });
  });
});

describe("startPayment", () => {
  const defaultExpectedData = {
    consumer: {
      givenNames: fullOrder.user.firstName,
      surname: fullOrder.user.lastName,
      email: fullOrder.user.email,
      phoneNumber: fullOrder.user.phoneNumber,
    },
    shipping: {
      name: fullOrder.shipping.name,
      phoneNumber: fullOrder.shipping.phoneNumber,
      countryCode: fullOrder.shipping.address.countryCode,
      postcode: fullOrder.shipping.address.postCode,
      suburb: fullOrder.shipping.address.city,
      line1: fullOrder.shipping.address.addressLine,
    },
    billing: {
      name: fullOrder.billing.name,
      phoneNumber: fullOrder.billing.phoneNumber,
      countryCode: fullOrder.billing.address.countryCode,
      postcode: fullOrder.billing.address.postCode,
      suburb: fullOrder.billing.address.city,
      line1: fullOrder.billing.address.addressLine,
    },
  };

  test.each([
    ["full details", fullOrder, defaultExpectedData],
    [
      "missing: `user.email`",
      { ...fullOrder, user: omit("email", fullOrder.user) },
      {
        ...defaultExpectedData,
        consumer: omit("email", defaultExpectedData.consumer),
      },
    ],
    [
      "missing: `user.phoneNumber`",
      { ...fullOrder, user: omit("phoneNumber", fullOrder.user) },
      {
        ...defaultExpectedData,
        consumer: omit("phoneNumber", defaultExpectedData.consumer),
      },
    ],
    [
      "missing: shipping.phoneNumber",
      {
        ...fullOrder,
        shipping: omit("phoneNumber", fullOrder.shipping),
      },
      {
        ...defaultExpectedData,
        shipping: omit("phoneNumber", defaultExpectedData.shipping),
      },
    ],
    [
      "missing: `billing`",
      omit("billing", fullOrder),
      omit("billing", defaultExpectedData),
    ],
    [
      "missing: `billing.name`",
      {
        ...fullOrder,
        billing: omit("name", fullOrder.billing),
      },
      {
        ...defaultExpectedData,
        billing: omit("name", defaultExpectedData.billing),
      },
    ],
    [
      "missing: billing.phoneNumber",
      {
        ...fullOrder,
        billing: omit("phoneNumber", fullOrder.billing),
      },
      {
        ...defaultExpectedData,
        billing: omit("phoneNumber", defaultExpectedData.billing),
      },
    ],
    [
      "missing: `billing.address`",
      {
        ...fullOrder,
        billing: omit("address", fullOrder.billing),
      },
      {
        ...defaultExpectedData,
        billing: {
          name: fullOrder.billing.name,
          phoneNumber: fullOrder.billing.phoneNumber,
        },
      },
    ],
  ])(
    "Request - %s",
    async (
      _,
      order,
      expected: {
        consumer: CheckoutConsumerData;
        shipping: CheckoutShippingData;
        billing?: CheckoutBillingData;
      },
    ) => {
      const config = makeTestConfig();
      const mockClient = {
        post: jest.fn(() => Promise.reject("not implemented")),
      };
      (axios.create as jest.Mock).mockReturnValue(mockClient);

      const expectedArgs: CheckoutRequestData = {
        totalAmount: { amount: "0.01", currency: "EUR" },
        consumer: expected.consumer,
        ...(expected.billing ? { billing: expected.billing } : {}),
        shipping: expected.shipping,
        items: order.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity as Int,
          name: item.name,
          gtin: item.gtin,
          category: item.category,
          price: {
            amount: item.netPriceInEur.toFixed(),
            currency: "EUR",
          },
        })),
        merchant: {
          redirectCancelUrl: config.merchantRedirectCancelUrl,
          redirectConfirmUrl: config.merchantRedirectSuccessUrl,
        },
        orderExpiryMilliseconds: config.orderExpirationInMilliseconds,
      };

      const gateway = createScalapayGateway(config);
      await gateway.startPayment(order as Order).catch(() => "not relevant");
      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(mockClient.post).toHaveBeenCalledWith("/v2/orders", expectedArgs);
    },
  );

  test("Error - response body parsing failed", async () => {
    const config = makeTestConfig();
    const mockClient = {
      post: jest.fn(() => Promise.resolve({ data: "this is not expected" })),
    };
    (axios.create as jest.Mock).mockReturnValue(mockClient);

    const gateway = createScalapayGateway(config);
    const result = await gateway.startPayment(fullOrder as Order);
    expect(result).toStrictEqual(E.left({ type: "PaymentGatewayError" }));
  });

  test("Error - unhandled", async () => {
    const error = "this was unexpected";
    const config = makeTestConfig();
    const mockClient = {
      post: jest.fn(() => Promise.reject(error)),
    };
    (axios.create as jest.Mock).mockReturnValue(mockClient);

    const gateway = createScalapayGateway(config);
    await expect(
      gateway.startPayment(fullOrder as Order),
    ).rejects.toStrictEqual(error);
  });

  test("Success - checkout info are returned", async () => {
    const config = makeTestConfig();
    const response = {
      data: {
        token: "91KZ7JDH04",
        expires: "2022-02-03T22:19:28.180Z",
        checkoutUrl: "https://portal.staging.scalapay.com/checkout/91KZ7JDH04",
      },
    };
    const expectedResult = E.right({ redirectUrl: response.data.checkoutUrl });

    const mockClient = {
      post: jest.fn(() => Promise.resolve(response)),
    };
    (axios.create as jest.Mock).mockReturnValue(mockClient);

    const gateway = createScalapayGateway(config);
    const result = await gateway.startPayment(fullOrder as Order);
    expect(result).toStrictEqual(expectedResult);
  });
});
