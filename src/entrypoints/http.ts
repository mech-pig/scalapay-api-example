import { pipe } from "fp-ts/function";
import { formatValidationErrors } from "io-ts-reporters";
import express, { Application as ExpressApplication } from "express";
import expressPino from "express-pino-logger";
import { fold, mapLeft } from "fp-ts/Either";
import { Logger } from "pino";

import { Application, CreateOrderRequest } from "@domain/application";
import { ProductCodec } from "@domain/data";

function create(application: Application, logger: Logger): ExpressApplication {
  const api = express();
  api.use(express.json());
  api.use(expressPino({ logger }));

  api.get("/products", (_, res) => {
    pipe(
      application.listProducts(),
      (products) => products.map(ProductCodec.encode),
      (items) => {
        res.status(200);
        res.json({ items });
      },
    );
  });

  api.post("/orders", (req, res) => {
    pipe(
      CreateOrderRequest.decode(req.body),
      mapLeft(formatValidationErrors),
      fold(
        (validationErrors) => {
          res.status(422);
          res.json({
            type: "InvalidRequest",
            errors: validationErrors,
          });
        },
        (createOrderRequest) => {
          application
            .createOrder(createOrderRequest)
            .then((result) =>
              pipe(
                result,
                fold(
                  (error) => {
                    logger.info(error, "create order request failed");
                    if (error.type === "UnavailableProducts") {
                      return { status: 400, data: error as {} };
                    }
                    if (error.type === "DuplicateItems") {
                      return { status: 400, data: error as {} };
                    }
                    return { status: 500, data: error as {} };
                  },
                  (orderCreated) => ({ status: 200, data: orderCreated as {} }),
                ),
                ({ status, data }) => {
                  res.status(status);
                  res.json(data);
                },
              ),
            )
            .catch((error) => {
              logger.error(error);
              res.status(500);
              res.json({
                type: "InternalServerError",
              });
            });
        },
      ),
    );
  });
  return api;
}

export default create;
