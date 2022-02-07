import * as E from "fp-ts/Either";
import BigNumber from "bignumber.js";
import { NonEmptyArray } from "fp-ts/NonEmptyArray";

import {
  Order,
  OrderItem,
  PriceCodec,
  getOrderAmount,
  Vat,
  Price,
  Quantity,
  QuantityCodec,
} from "@domain/data";

describe("Price", () => {
  test.each([
    ["non number", "not-a-number"],
    ["negative number", "-1"],
    ["null", null],
    ["undefined", undefined],
  ])("can't decode %s", (_, value) => {
    const result = PriceCodec.decode(value);
    expect(E.isLeft(result)).toBe(true);
  });

  test.each([
    ["zero", "0"],
    ["positive integer", "1"],
    ["positive decimal", "0.1"],
  ])("decodes %s", (_, value) => {
    const expected = new BigNumber(value);
    const result = PriceCodec.decode(value);
    expect(result).toEqual(E.right(expected));
  });

  test("encode", () => {
    const price = new BigNumber(0.01) as Price;
    const expected = "0.01";
    expect(PriceCodec.encode(price)).toStrictEqual(expected);
  });
});

describe("Quantity", () => {
  test.each([
    ["non number", "not-a-number"],
    ["negative number", "-1"],
    ["zero", 0],
    ["non integer", 0.1],
    ["null", null],
    ["undefined", undefined],
  ])("can't decode %s", (_, value) => {
    const result = QuantityCodec.decode(value);
    expect(E.isLeft(result)).toBe(true);
  });
});

describe("getOrderAmount", () => {
  function makeOrder(
    items: NonEmptyArray<OrderItem>,
    shippingCost: { netPriceInEur: BigNumber; vat: Vat },
  ): Order {
    return {
      user: {
        firstName: "user.firstName.test",
        lastName: "user.lastName.test",
      },
      shipping: {
        to: {
          name: "test",
          address: {
            countryCode: "IT",
            city: "Milano",
            postCode: "20100",
            addressLine: "Vicolo Stretto, 1",
          },
          phoneNumber: "+3 4567 8901",
        },
        netPriceInEur: shippingCost.netPriceInEur,
        vat: shippingCost.vat,
      },
      items,
    };
  }

  function makeOrderItem(item: Partial<OrderItem> = {}): OrderItem {
    const sku = item.sku ?? "test";
    return {
      sku,
      name: `${sku}.name`,
      gtin: `${sku}.gtin`,
      brand: `${sku}.brand`,
      category: `${sku}.category`,
      netUnitPriceInEur: new BigNumber("12.34"),
      quantity: 1 as Quantity,
      vat: 0,
      ...item,
    };
  }

  test.each([
    [
      "single item, quantity = 1, 0% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("9.99"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("9.99"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("9.99"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("9.99"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("9.99"),
      },
    ],
    [
      "single item, quantity = 1, 0% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("9.99"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("1.00"),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("9.99"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("9.99"),
        shippingNetSubtotalInEur: new BigNumber("1.00"),
        shippingVatSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber("1.00"),
        orderNetSubtotalInEur: new BigNumber("10.99"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("10.99"),
      },
    ],
    [
      "single item, quantity > 1, 0% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("9.99"),
          vat: 0,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("29.97"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("29.97"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("29.97"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("29.97"),
      },
    ],
    [
      "single item, quantity > 1, 0% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("9.99"),
          vat: 0,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("1.00"),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("29.97"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("29.97"),
        shippingNetSubtotalInEur: new BigNumber("1.00"),
        shippingVatSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber("1.00"),
        orderNetSubtotalInEur: new BigNumber("30.97"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("30.97"),
      },
    ],
    [
      "single item, quantity = 1, 4% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 4,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.00"),
        itemsVatSubtotalInEur: new BigNumber("0.04"),
        itemsSubtotalInEur: new BigNumber("1.04"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("1.00"),
        orderVatSubtotalInEur: new BigNumber("0.04"),
        orderTotalInEur: new BigNumber("1.04"),
      },
    ],
    [
      "single item, quantity = 1, 4% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 4,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("1.00"),
        vat: 4 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.00"),
        itemsVatSubtotalInEur: new BigNumber("0.04"),
        itemsSubtotalInEur: new BigNumber("1.04"),
        shippingNetSubtotalInEur: new BigNumber("1.00"),
        shippingVatSubtotalInEur: new BigNumber("0.04"),
        shippingSubtotalInEur: new BigNumber("1.04"),
        orderNetSubtotalInEur: new BigNumber("2.00"),
        orderVatSubtotalInEur: new BigNumber("0.08"),
        orderTotalInEur: new BigNumber("2.08"),
      },
    ],
    [
      "single item, quantity > 1, 4% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 4,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("3.00"),
        itemsVatSubtotalInEur: new BigNumber("0.12"),
        itemsSubtotalInEur: new BigNumber("3.12"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("3.00"),
        orderVatSubtotalInEur: new BigNumber("0.12"),
        orderTotalInEur: new BigNumber("3.12"),
      },
    ],
    [
      "single item, quantity > 1, 4% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 4,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("5.00"),
        vat: 4 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("3.00"),
        itemsVatSubtotalInEur: new BigNumber("0.12"),
        itemsSubtotalInEur: new BigNumber("3.12"),
        shippingNetSubtotalInEur: new BigNumber("5.00"),
        shippingVatSubtotalInEur: new BigNumber("0.20"),
        shippingSubtotalInEur: new BigNumber("5.2"),
        orderNetSubtotalInEur: new BigNumber("8.00"),
        orderVatSubtotalInEur: new BigNumber("0.32"),
        orderTotalInEur: new BigNumber("8.32"),
      },
    ],
    [
      "single item, quantity = 1, 10% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 10,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.00"),
        itemsVatSubtotalInEur: new BigNumber("0.10"),
        itemsSubtotalInEur: new BigNumber("1.1"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("1"),
        orderVatSubtotalInEur: new BigNumber("0.1"),
        orderTotalInEur: new BigNumber("1.1"),
      },
    ],
    [
      "single item, quantity = 1, 10% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 10,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("0.5"),
        vat: 10 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.00"),
        itemsVatSubtotalInEur: new BigNumber("0.10"),
        itemsSubtotalInEur: new BigNumber("1.1"),
        shippingNetSubtotalInEur: new BigNumber("0.5"),
        shippingVatSubtotalInEur: new BigNumber("0.05"),
        shippingSubtotalInEur: new BigNumber("0.55"),
        orderNetSubtotalInEur: new BigNumber("1.5"),
        orderVatSubtotalInEur: new BigNumber("0.15"),
        orderTotalInEur: new BigNumber("1.65"),
      },
    ],
    [
      "single item, quantity > 1, 10% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 10,
          quantity: 5 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("5.00"),
        itemsVatSubtotalInEur: new BigNumber("0.50"),
        itemsSubtotalInEur: new BigNumber("5.5"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("5"),
        orderVatSubtotalInEur: new BigNumber("0.5"),
        orderTotalInEur: new BigNumber("5.5"),
      },
    ],
    [
      "single item, quantity > 1, 10% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 10,
          quantity: 5 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("3.00"),
        vat: 10 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("5.00"),
        itemsVatSubtotalInEur: new BigNumber("0.50"),
        itemsSubtotalInEur: new BigNumber("5.5"),
        shippingNetSubtotalInEur: new BigNumber("3"),
        shippingVatSubtotalInEur: new BigNumber("0.3"),
        shippingSubtotalInEur: new BigNumber("3.30"),
        orderNetSubtotalInEur: new BigNumber("8"),
        orderVatSubtotalInEur: new BigNumber("0.8"),
        orderTotalInEur: new BigNumber("8.8"),
      },
    ],
    [
      "single item, quantity = 1, 22% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 22,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.00"),
        itemsVatSubtotalInEur: new BigNumber("0.22"),
        itemsSubtotalInEur: new BigNumber("1.22"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("1"),
        orderVatSubtotalInEur: new BigNumber("0.22"),
        orderTotalInEur: new BigNumber("1.22"),
      },
    ],
    [
      "single item, quantity = 1, 22% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 22,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("5.00"),
        vat: 22 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.00"),
        itemsVatSubtotalInEur: new BigNumber("0.22"),
        itemsSubtotalInEur: new BigNumber("1.22"),
        shippingNetSubtotalInEur: new BigNumber("5.00"),
        shippingVatSubtotalInEur: new BigNumber("1.1"),
        shippingSubtotalInEur: new BigNumber("6.1"),
        orderNetSubtotalInEur: new BigNumber("6"),
        orderVatSubtotalInEur: new BigNumber("1.32"),
        orderTotalInEur: new BigNumber("7.32"),
      },
    ],
    [
      "single item, quantity > 1, 22% vat, no shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 22,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("3.00"),
        itemsVatSubtotalInEur: new BigNumber("0.66"),
        itemsSubtotalInEur: new BigNumber("3.66"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("3"),
        orderVatSubtotalInEur: new BigNumber("0.66"),
        orderTotalInEur: new BigNumber("3.66"),
      },
    ],
    [
      "single item, quantity > 1, 22% vat, with shipping",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 22,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("1.00"),
        vat: 22 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("3.00"),
        itemsVatSubtotalInEur: new BigNumber("0.66"),
        itemsSubtotalInEur: new BigNumber("3.66"),
        shippingNetSubtotalInEur: new BigNumber("1.00"),
        shippingVatSubtotalInEur: new BigNumber("0.22"),
        shippingSubtotalInEur: new BigNumber("1.22"),
        orderNetSubtotalInEur: new BigNumber("4"),
        orderVatSubtotalInEur: new BigNumber("0.88"),
        orderTotalInEur: new BigNumber("4.88"),
      },
    ],
    [
      "multiple items, quantity = 1, no vat, no shipping",
      [
        makeOrderItem({
          sku: "1",
          netUnitPriceInEur: new BigNumber("0.01"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "2",
          netUnitPriceInEur: new BigNumber("0.10"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "3",
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.11"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("1.11"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("1.11"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("1.11"),
      },
    ],
    [
      "multiple items, quantity = 1, no vat, with shipping",
      [
        makeOrderItem({
          sku: "1",
          netUnitPriceInEur: new BigNumber("0.01"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "2",
          netUnitPriceInEur: new BigNumber("0.10"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "3",
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("2.00"),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("1.11"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("1.11"),
        shippingNetSubtotalInEur: new BigNumber("2"),
        shippingVatSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber("2"),
        orderNetSubtotalInEur: new BigNumber("3.11"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("3.11"),
      },
    ],
    [
      "multiple items, mixed quantities, no vat, no shipping",
      [
        makeOrderItem({
          sku: "1",
          netUnitPriceInEur: new BigNumber("0.01"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "2",
          netUnitPriceInEur: new BigNumber("0.10"),
          vat: 0,
          quantity: 2 as Quantity,
        }),
        makeOrderItem({
          sku: "3",
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 0,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("3.21"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("3.21"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("3.21"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("3.21"),
      },
    ],
    [
      "multiple items, mixed quantities, no vat, with shipping",
      [
        makeOrderItem({
          sku: "1",
          netUnitPriceInEur: new BigNumber("0.01"),
          vat: 0,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "2",
          netUnitPriceInEur: new BigNumber("0.10"),
          vat: 0,
          quantity: 2 as Quantity,
        }),
        makeOrderItem({
          sku: "3",
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 0,
          quantity: 3 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("2.00"),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("3.21"),
        itemsVatSubtotalInEur: new BigNumber(0),
        itemsSubtotalInEur: new BigNumber("3.21"),
        shippingNetSubtotalInEur: new BigNumber("2"),
        shippingVatSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber("2"),
        orderNetSubtotalInEur: new BigNumber("5.21"),
        orderVatSubtotalInEur: new BigNumber(0),
        orderTotalInEur: new BigNumber("5.21"),
      },
    ],
    [
      "multiple items, quantity = 1, mixed vat, no shipping",
      [
        makeOrderItem({
          sku: "4",
          netUnitPriceInEur: new BigNumber("1"),
          vat: 4,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "10",
          netUnitPriceInEur: new BigNumber("10"),
          vat: 10,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "22",
          netUnitPriceInEur: new BigNumber("100"),
          vat: 22,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("111"),
        itemsVatSubtotalInEur: new BigNumber("23.04"),
        itemsSubtotalInEur: new BigNumber("134.04"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("111"),
        orderVatSubtotalInEur: new BigNumber("23.04"),
        orderTotalInEur: new BigNumber("134.04"),
      },
    ],
    [
      "multiple items, quantity = 1, mixed vat, with shipping",
      [
        makeOrderItem({
          sku: "4",
          netUnitPriceInEur: new BigNumber("1"),
          vat: 4,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "10",
          netUnitPriceInEur: new BigNumber("10"),
          vat: 10,
          quantity: 1 as Quantity,
        }),
        makeOrderItem({
          sku: "22",
          netUnitPriceInEur: new BigNumber("100"),
          vat: 22,
          quantity: 1 as Quantity,
        }),
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("5.00"),
        vat: 10 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("111"),
        itemsVatSubtotalInEur: new BigNumber("23.04"),
        itemsSubtotalInEur: new BigNumber("134.04"),
        shippingNetSubtotalInEur: new BigNumber("5.00"),
        shippingVatSubtotalInEur: new BigNumber("0.5"),
        shippingSubtotalInEur: new BigNumber("5.5"),
        orderNetSubtotalInEur: new BigNumber("116"),
        orderVatSubtotalInEur: new BigNumber("23.54"),
        orderTotalInEur: new BigNumber("139.54"),
      },
    ],
    [
      "multiple items, mixed quantities, mixed vat, no shipping",
      [
        makeOrderItem({
          sku: "4",
          netUnitPriceInEur: new BigNumber("1"),
          vat: 4,
          quantity: 1 as Quantity,
        }), // vat 0.04
        makeOrderItem({
          sku: "10",
          netUnitPriceInEur: new BigNumber("10"),
          vat: 10,
          quantity: 2 as Quantity,
        }), // vat: 2
        makeOrderItem({
          sku: "22",
          netUnitPriceInEur: new BigNumber("100"),
          vat: 22,
          quantity: 3 as Quantity,
        }), // vat: 66
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber(0),
        vat: 0 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("321"),
        itemsVatSubtotalInEur: new BigNumber("68.04"),
        itemsSubtotalInEur: new BigNumber("389.04"),
        shippingNetSubtotalInEur: new BigNumber(0),
        shippingSubtotalInEur: new BigNumber(0),
        shippingVatSubtotalInEur: new BigNumber(0),
        orderNetSubtotalInEur: new BigNumber("321"),
        orderVatSubtotalInEur: new BigNumber("68.04"),
        orderTotalInEur: new BigNumber("389.04"),
      },
    ],
    [
      "multiple items, mixed quantities, mixed vat, with shipping",
      [
        makeOrderItem({
          sku: "4",
          netUnitPriceInEur: new BigNumber("1"),
          vat: 4,
          quantity: 1 as Quantity,
        }), // vat 0.04
        makeOrderItem({
          sku: "10",
          netUnitPriceInEur: new BigNumber("10"),
          vat: 10,
          quantity: 2 as Quantity,
        }), // vat: 2
        makeOrderItem({
          sku: "22",
          netUnitPriceInEur: new BigNumber("100"),
          vat: 22,
          quantity: 3 as Quantity,
        }), // vat: 66
      ] as NonEmptyArray<OrderItem>,
      {
        netPriceInEur: new BigNumber("5.00"),
        vat: 22 as Vat,
      },
      {
        itemsNetSubtotalInEur: new BigNumber("321"),
        itemsVatSubtotalInEur: new BigNumber("68.04"),
        itemsSubtotalInEur: new BigNumber("389.04"),
        shippingNetSubtotalInEur: new BigNumber("5.00"),
        shippingVatSubtotalInEur: new BigNumber("1.10"),
        shippingSubtotalInEur: new BigNumber("6.10"),
        orderNetSubtotalInEur: new BigNumber("326"),
        orderVatSubtotalInEur: new BigNumber("69.14"),
        orderTotalInEur: new BigNumber("395.14"),
      },
    ],
  ])("%s", (_, items, shippingCost, expectedAmount) => {
    const order = makeOrder(items, shippingCost);
    const amount = getOrderAmount(order);
    expect(amount).toStrictEqual(expectedAmount);
  });
});
