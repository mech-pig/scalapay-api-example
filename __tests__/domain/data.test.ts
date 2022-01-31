import * as E from "fp-ts/Either";
import { PriceCodec } from "@domain/data";
import BigNumber from "bignumber.js";

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
