import * as t from "io-ts";

// a unique brand for positive numbers
interface PositiveBrand {
  readonly Positive: unique symbol; // use `unique symbol` here to ensure uniqueness across modules / packages
}

export const PositiveCodec = t.brand(
  t.number,
  (n): n is t.Branded<number, PositiveBrand> => 0 < n,
  "Positive",
);

export type Positive = t.TypeOf<typeof PositiveCodec>;
