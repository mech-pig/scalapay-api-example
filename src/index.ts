import BigNumber from "bignumber.js";
import createHttpServer from "@entrypoints/http";
import createApplication from "@domain/application";
import { Product } from "@domain/data";

const products: Product[] = [
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
const application = createApplication(products);
const server = createHttpServer(application).listen(8080, () =>
  console.log("Server listenning on port 8080"),
);

export default server;
