import BigNumber from "bignumber.js";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import * as t from "io-ts";
import { failure } from "io-ts/PathReporter";

import createHttpServer from "@entrypoints/http";
import createApplication from "@domain/application";
import { Product } from "@domain/data";
import createScalapayGateway, {
  ScalapayGatewayConfigCodec,
} from "@adapters/scalapay/payment-gateway";

const products: Product[] = [
  {
    sku: "0",
    name: "product-0",
    gtin: "0400939035768",
    brand: "acme",
    unitPriceInEur: new BigNumber("9.99"),
    category: "clothes",
    vat: 22,
  },
  {
    sku: "1",
    name: "product-1",
    gtin: "1400939035767",
    brand: "acme",
    unitPriceInEur: new BigNumber("17.54"),
    category: "electronic",
    vat: 22,
  },
  {
    sku: "2",
    name: "product-2",
    gtin: "2400939035766",
    brand: "acme",
    unitPriceInEur: new BigNumber("1.12"),
    category: "home",
    vat: 22,
  },
];

const ConfigCodec = t.type({
  httpPort: t.Int,
  scalapay: ScalapayGatewayConfigCodec,
});

const config = {
  httpPort: 8080,
  scalapay: {
    baseUrl: process.env["SCALAPAY_BASE_URL"],
    authToken: process.env["SCALAPAY_AUTH_TOKEN"],
    merchantRedirectSuccessUrl:
      process.env["SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL"],
    merchantRedirectCancelUrl:
      process.env["SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL"],
    clientTimeoutInMilliseconds: 5000,
    orderExpirationInMilliseconds: 1000 * 60 * 5, // five mins
  },
};

const server = pipe(
  config,
  ConfigCodec.decode,
  E.getOrElseW((e) => {
    console.error(failure(e));
    process.exit(1);
  }),
  ({ httpPort, scalapay }) => {
    const gateway = createScalapayGateway(scalapay);
    const application = createApplication(products, gateway);
    return createHttpServer(application)
      .listen(httpPort, () =>
        console.log(`Server listenning on port ${httpPort}`),
      )
      .on("error", (error) => {
        console.error(error);
        process.exit(1);
      });
  },
);

export default server;
