import { ShippingService } from "@domain/application";
import { Vat } from "@domain/data";
import BigNumber from "bignumber.js";

export default function createMockShippingService(
  netPriceInEur: BigNumber,
  vat: Vat,
): ShippingService {
  return {
    getCost() {
      return Promise.resolve({ netPriceInEur, vat });
    },
  };
}
