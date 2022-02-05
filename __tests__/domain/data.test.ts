import * as E from "fp-ts/Either";
import BigNumber from "bignumber.js";
import { NonEmptyArray } from "fp-ts/NonEmptyArray";

import { Order, OrderItem, PriceCodec, getOrderAmount } from "@domain/data";

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
});

describe("getOrderAmount", () => {
  function makeOrder(items: NonEmptyArray<OrderItem>): Order {
    return {
      user: {
        firstName: "user.firstName.test",
        lastName: "user.lastName.test",
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
      quantity: 1,
      vat: 0,
      ...item,
    };
  }

  test.each([
    [
      "single item, quantity = 1, 0% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("9.99"),
          vat: 0,
          quantity: 1,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("9.99"), taxInEur: new BigNumber(0) },
    ],
    [
      "single item, quantity > 1, 0% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("9.99"),
          vat: 0,
          quantity: 3,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("29.97"), taxInEur: new BigNumber(0) },
    ],
    [
      "single item, quantity = 1, 4% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 4,
          quantity: 1,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("1.00"), taxInEur: new BigNumber("0.04") },
    ],
    [
      "single item, quantity > 1, 4% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 4,
          quantity: 3,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("3.00"), taxInEur: new BigNumber("0.12") },
    ],
    [
      "single item, quantity = 1, 10% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 10,
          quantity: 1,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("1.00"), taxInEur: new BigNumber("0.10") },
    ],
    [
      "single item, quantity > 1, 10% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 10,
          quantity: 5,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("5.00"), taxInEur: new BigNumber("0.50") },
    ],
    [
      "single item, quantity = 1, 22% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 22,
          quantity: 1,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("1.00"), taxInEur: new BigNumber("0.22") },
    ],
    [
      "single item, quantity > 1, 22% vat",
      [
        makeOrderItem({
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 22,
          quantity: 3,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("3.00"), taxInEur: new BigNumber("0.66") },
    ],
    [
      "multiple items, quantity = 1, no vat",
      [
        makeOrderItem({
          sku: "1",
          netUnitPriceInEur: new BigNumber("0.01"),
          vat: 0,
          quantity: 1,
        }),
        makeOrderItem({
          sku: "2",
          netUnitPriceInEur: new BigNumber("0.10"),
          vat: 0,
          quantity: 1,
        }),
        makeOrderItem({
          sku: "3",
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 0,
          quantity: 1,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("1.11"), taxInEur: new BigNumber(0) },
    ],
    [
      "multiple items, mixed quantities, no vat",
      [
        makeOrderItem({
          sku: "1",
          netUnitPriceInEur: new BigNumber("0.01"),
          vat: 0,
          quantity: 1,
        }),
        makeOrderItem({
          sku: "2",
          netUnitPriceInEur: new BigNumber("0.10"),
          vat: 0,
          quantity: 2,
        }),
        makeOrderItem({
          sku: "3",
          netUnitPriceInEur: new BigNumber("1.00"),
          vat: 0,
          quantity: 3,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("3.21"), taxInEur: new BigNumber(0) },
    ],
    [
      "multiple items, quantity = 1, mixed vat",
      [
        makeOrderItem({
          sku: "4",
          netUnitPriceInEur: new BigNumber("1"),
          vat: 4,
          quantity: 1,
        }),
        makeOrderItem({
          sku: "10",
          netUnitPriceInEur: new BigNumber("10"),
          vat: 10,
          quantity: 1,
        }),
        makeOrderItem({
          sku: "22",
          netUnitPriceInEur: new BigNumber("100"),
          vat: 22,
          quantity: 1,
        }),
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("111"), taxInEur: new BigNumber("23.04") },
    ],
    [
      "multiple items, mixed quantities, mixed vat",
      [
        makeOrderItem({
          sku: "4",
          netUnitPriceInEur: new BigNumber("1"),
          vat: 4,
          quantity: 1,
        }), // vat 0.04
        makeOrderItem({
          sku: "10",
          netUnitPriceInEur: new BigNumber("10"),
          vat: 10,
          quantity: 2,
        }), // vat: 2
        makeOrderItem({
          sku: "22",
          netUnitPriceInEur: new BigNumber("100"),
          vat: 22,
          quantity: 3,
        }), // vat: 66
      ] as NonEmptyArray<OrderItem>,
      { netInEur: new BigNumber("321"), taxInEur: new BigNumber("68.04") },
    ],
  ])("%s", (_, items, expectedAmount) => {
    const order = makeOrder(items);
    const amount = getOrderAmount(order);
    expect(amount).toStrictEqual(expectedAmount);
  });
});
