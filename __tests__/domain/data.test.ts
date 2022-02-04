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
      netPriceInEur: new BigNumber("12.34"),
      quantity: 1,
      vat: 0,
      ...item,
    };
  }

  test.each([
    [
      "single item, 0% vat",
      [
        makeOrderItem({ netPriceInEur: new BigNumber("9.99"), vat: 0 }),
      ] as NonEmptyArray<OrderItem>,
      { totalInEur: new BigNumber("9.99"), taxInEur: new BigNumber(0) },
    ],
    [
      "single item, 4% vat",
      [
        makeOrderItem({ netPriceInEur: new BigNumber("1.00"), vat: 4 }),
      ] as NonEmptyArray<OrderItem>,
      { totalInEur: new BigNumber("1.00"), taxInEur: new BigNumber("0.04") },
    ],
    [
      "single item, 10% vat",
      [
        makeOrderItem({ netPriceInEur: new BigNumber("1.00"), vat: 10 }),
      ] as NonEmptyArray<OrderItem>,
      { totalInEur: new BigNumber("1.00"), taxInEur: new BigNumber("0.10") },
    ],
    [
      "single item, 22% vat",
      [
        makeOrderItem({ netPriceInEur: new BigNumber("1.00"), vat: 22 }),
      ] as NonEmptyArray<OrderItem>,
      { totalInEur: new BigNumber("1.00"), taxInEur: new BigNumber("0.22") },
    ],
    [
      "multiple items, no vat",
      [
        makeOrderItem({
          sku: "1",
          netPriceInEur: new BigNumber("0.01"),
          vat: 0,
        }),
        makeOrderItem({
          sku: "2",
          netPriceInEur: new BigNumber("0.10"),
          vat: 0,
        }),
        makeOrderItem({
          sku: "3",
          netPriceInEur: new BigNumber("1.00"),
          vat: 0,
        }),
      ] as NonEmptyArray<OrderItem>,
      { totalInEur: new BigNumber("1.11"), taxInEur: new BigNumber(0) },
    ],
    [
      "multiple items, vat",
      [
        makeOrderItem({ sku: "4", netPriceInEur: new BigNumber("1"), vat: 4 }),
        makeOrderItem({
          sku: "10",
          netPriceInEur: new BigNumber("10"),
          vat: 10,
        }),
        makeOrderItem({
          sku: "22",
          netPriceInEur: new BigNumber("100"),
          vat: 22,
        }),
      ] as NonEmptyArray<OrderItem>,
      { totalInEur: new BigNumber("111"), taxInEur: new BigNumber("23.04") },
    ],
  ])("%s", (_, items, expectedAmount) => {
    const order = makeOrder(items);
    const amount = getOrderAmount(order);
    expect(amount).toStrictEqual(expectedAmount);
  });
});
