import supertest from "supertest";

import createApplication, { CreateOrderRequest } from "@domain/application";
import createHttpServer from "@entrypoints/http";
import { Product } from "@domain/data";
import BigNumber from "bignumber.js";

function testClient(products: Product[]) {
  const application = createApplication(products);
  const server = createHttpServer(application);
  return supertest(server);
}

describe("createOrder", () => {
  const defaultAvailableProducts: Product[] = [
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
    items: defaultAvailableProducts.map((value, index) => ({
      ...value,
      quantity: index + 1,
    })),
  };

  const omit = <A, P extends keyof A>(prop: P, a: A): Omit<A, P> => {
    const { [prop]: _, ...toReturn } = a;
    return toReturn;
  };

  test.each([
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

  test("Error: one or more products not found", async () => {
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
});
