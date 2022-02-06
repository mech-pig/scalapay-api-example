import { Logger } from "pino";

import { ShippingService, ShippingCost } from "@domain/application";

export type MockShippingServiceConfig = {
  shippingCost: ShippingCost;
};

export default function createMockShippingService(
  config: MockShippingServiceConfig,
  logger: Logger,
): ShippingService {
  logger.info(config, "created mock shipping service");
  return {
    getCost() {
      logger.info(config.shippingCost, "returning fixed shipping cost");
      return Promise.resolve(config.shippingCost);
    },
  };
}
