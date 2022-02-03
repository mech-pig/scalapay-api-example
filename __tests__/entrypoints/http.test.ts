import supertest from "supertest";
import BigNumber from "bignumber.js";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import { NonEmptyArray, map, mapWithIndex } from "fp-ts/NonEmptyArray";

import createApplication, {
  CreateOrderRequest,
  PaymentGateway,
  StartPaymentResult,
} from "@domain/application";
import createHttpServer from "@entrypoints/http";
import { Order, Product } from "@domain/data";
import createMockPaymentGateway from "@adapters/development/payment-gateway";

import { omit } from "../utils";

const defaultPaymentGateway = createMockPaymentGateway();

function testClient(products: Product[], paymentGateway?: PaymentGateway) {
  const application = createApplication(
    products,
    paymentGateway ?? defaultPaymentGateway,
  );
  const server = createHttpServer(application);
  return supertest(server);
}

describe("createOrder", () => {
  const defaultAvailableProducts: NonEmptyArray<Product> = [
    {
      sku: "0",
      name: "product-0",
      gtin: "0400939035768",
      brand: "acme",
      unitPriceInEur: new BigNumber("9.99"),
      category: "clothes",
    },
    {
      sku: "1",
      name: "product-1",
      gtin: "1400939035767",
      brand: "acme",
      unitPriceInEur: new BigNumber("17.54"),
      category: "electronic",
    },
    {
      sku: "2",
      name: "product-2",
      gtin: "2400939035766",
      brand: "acme",
      unitPriceInEur: new BigNumber("1.12"),
      category: "home",
    },
  ];

  const defaultRequest: CreateOrderRequest = {
    user: {
      firstName: "first-name",
      lastName: "last-name",
      email: "first.last@test.com",
      phoneNumber: "+1 23 456 789",
    },
    shipping: {
      name: "test",
      address: {
        countryCode: "IT",
        city: "Milano",
        postCode: "20100",
        addressLine: "Vicolo Stretto, 1",
      },
      phoneNumber: "+39 000 000000",
    },
    items: pipe(
      defaultAvailableProducts,
      mapWithIndex((index, value) => ({
        sku: value.sku,
        quantity: index + 1,
      })),
    ),
  };

  test.each([
    ["missing: `user`", omit("user", defaultRequest)],
    [
      "missing: `user.firstName`",
      { ...defaultRequest, user: omit("firstName", defaultRequest.user) },
    ],
    [
      "missing: `user.lastName`",
      { ...defaultRequest, user: omit("lastName", defaultRequest.user) },
    ],
    ["missing: `shipping`", omit("shipping", defaultRequest)],
    [
      "missing: `shipping.name`",
      { ...defaultRequest, shipping: omit("name", defaultRequest.shipping) },
    ],
    [
      "missing: `shipping.address`",
      { ...defaultRequest, shipping: omit("address", defaultRequest.shipping) },
    ],
    [
      "missing: `shipping.address.countryCode`",
      {
        ...defaultRequest,
        shipping: {
          ...defaultRequest.shipping,
          address: omit("countryCode", defaultRequest.shipping.address),
        },
      },
    ],
    [
      "missing: `shipping.address.city`",
      {
        ...defaultRequest,
        shipping: {
          ...defaultRequest.shipping,
          address: omit("city", defaultRequest.shipping.address),
        },
      },
    ],
    [
      "missing: `shipping.address.postCode`",
      {
        ...defaultRequest,
        shipping: {
          ...defaultRequest.shipping,
          address: omit("postCode", defaultRequest.shipping.address),
        },
      },
    ],
    [
      "missing: `shipping.address.addressLine`",
      {
        ...defaultRequest,
        shipping: {
          ...defaultRequest.shipping,
          address: omit("addressLine", defaultRequest.shipping.address),
        },
      },
    ],
    ["missing: `items`", omit("items", defaultRequest)],
    ["invalid: `items` is empty", { ...defaultRequest, items: [] }],
    [
      "missing: `items.*.sku`",
      {
        ...defaultRequest,
        items: [...defaultRequest.items, { quantity: 2 }],
      },
    ],
    [
      "missing: `items.*.quantity`",
      {
        ...defaultRequest,
        items: [...defaultRequest.items, { sku: "23409832598" }],
      },
    ],
  ])("Invalid Request - %s", async (_, request) => {
    const response = await testClient(defaultAvailableProducts)
      .post("/orders")
      .send(request);
    expect(response.status).toBe(422);
    expect(response.body.type).toStrictEqual("InvalidRequest");
  });

  test("Error - UnavailableProducts", async () => {
    const availableProducts = [...defaultAvailableProducts];
    const availableProductSkus = availableProducts.map((p) => p.sku);
    const notAvailableProductsSkus = ["4598712487", "23409823409"];
    notAvailableProductsSkus.forEach((sku) =>
      expect(availableProductSkus).toEqual(expect.not.arrayContaining([sku])),
    );

    const request = {
      ...defaultRequest,
      items: notAvailableProductsSkus.map((sku) => ({ sku, quantity: 1 })),
    };
    const response = await testClient(availableProducts)
      .post("/orders")
      .send(request);

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      type: "UnavailableProducts",
      skus: notAvailableProductsSkus,
    });
  });

  test.each([
    [
      "PaymentGatewayError",
      (_: Order): Promise<StartPaymentResult> =>
        Promise.resolve(E.left({ type: "PaymentGatewayError" })),
      500,
      { type: "PaymentGatewayError" },
    ],
    [
      "unhandled",
      (_: Order): Promise<StartPaymentResult> => Promise.reject(),
      500,
      { type: "InternalServerError" },
    ],
  ])(
    "Error - PaymentGateway/%s",
    async (
      _,
      startPaymentMock: (order: Order) => Promise<StartPaymentResult>,
      expectedStatus: number,
      expectedPayload: {},
    ) => {
      const request = defaultRequest;
      const products = defaultAvailableProducts;
      const paymentGateway = { startPayment: startPaymentMock };
      const response = await testClient(products, paymentGateway)
        .post("/orders")
        .send(request);

      expect(response.status).toBe(expectedStatus);
      expect(response.body).toStrictEqual(expectedPayload);
    },
  );

  test("Success - order payment is started", async () => {
    const orderProducts: NonEmptyArray<Product> = [
      {
        sku: "included-product-0",
        name: "included-product-0",
        gtin: "included-product-0",
        brand: "acme",
        unitPriceInEur: new BigNumber("9.99"),
        category: "garden",
      },
      {
        sku: "included-product-1",
        name: "included-product-1",
        gtin: "included-product-1",
        brand: "acme",
        unitPriceInEur: new BigNumber("0.63"),
        category: "electronic",
      },
    ];
    const otherProducts: NonEmptyArray<Product> = [
      {
        sku: "excluded-product-0",
        name: "excluded-product-0",
        gtin: "excluded-product-0",
        brand: "acme",
        unitPriceInEur: new BigNumber("1.59"),
        category: "clothes",
      },
      {
        sku: "excluded-product-1",
        name: "excluded-product-1",
        gtin: "excluded-product-1",
        brand: "acme",
        unitPriceInEur: new BigNumber("8.97"),
        category: "food",
      },
    ];

    const expectedOrder: Order = {
      ...defaultRequest,
      items: pipe(
        orderProducts,
        mapWithIndex((index, order) => {
          const quantity = index + 1;
          return {
            sku: order.sku,
            name: order.name,
            brand: order.brand,
            gtin: order.gtin,
            category: order.category,
            quantity,
            netPriceInEur: order.unitPriceInEur.times(quantity),
          };
        }),
      ),
    };

    const request = {
      ...expectedOrder,
      items: pipe(
        expectedOrder.items,
        map((order) => ({ sku: order.sku, quantity: order.quantity })),
      ),
    };

    const products = [
      ...otherProducts,
      ...orderProducts,
    ] as NonEmptyArray<Product>;

    const paymentGateway = {
      startPayment: jest.fn(defaultPaymentGateway.startPayment),
    };
    await testClient(products, paymentGateway).post("/orders").send(request);

    expect(paymentGateway.startPayment).toHaveBeenCalledTimes(1);
    expect(paymentGateway.startPayment).toHaveBeenCalledWith(expectedOrder);
  });

  test("Success - payment details are returned", async () => {
    const request = defaultRequest;
    const products = defaultAvailableProducts;
    const responseFromPaymentGateway = { redirectUrl: "sentinel" };

    const paymentGateway = {
      startPayment: (_: Order) =>
        Promise.resolve(E.right(responseFromPaymentGateway)),
    };
    const response = await testClient(products, paymentGateway)
      .post("/orders")
      .send(request);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      paymentGatewayRedirectUrl: responseFromPaymentGateway.redirectUrl,
    });
  });
});
