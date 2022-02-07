import { pipe } from "fp-ts/function";
import { failure } from "io-ts/PathReporter";
import express, { Application as ExpressApplication } from "express";
import expressPino from "express-pino-logger";
import { fold } from "fp-ts/Either";
import { Logger } from "pino";

import { Application, CreateOrderRequest } from "@domain/application";

function create(application: Application, logger: Logger): ExpressApplication {
  const api = express();
  api.use(express.json());
  api.use(expressPino({ logger }));

  api.post("/orders", (req, res) => {
    pipe(
      CreateOrderRequest.decode(req.body),
      fold(
        (validationErrors) => {
          res.status(422);
          res.json({
            type: "InvalidRequest",
            errors: failure(validationErrors),
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
