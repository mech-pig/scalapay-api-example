import { pipe } from "fp-ts/function";
import { failure } from "io-ts/PathReporter";
import express, { Application as ExpressApplication } from "express";
import { Application, CreateOrderRequest } from "@domain/application";
import { fold } from "fp-ts/Either";

function create(application: Application): ExpressApplication {
  const api = express();
  api.use(express.json());

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
                  (error) => ({ status: 400, data: error as {} }),
                  (orderCreated) => ({ status: 200, data: orderCreated as {} }),
                ),
                ({ status, data }) => {
                  res.status(status);
                  res.json(data);
                },
              ),
            )
            .catch((error) => {
              console.error(error);
              res.status(500);
              res.json({
                type: "Internal Server Error",
              });
            });
        },
      ),
    );
  });
  return api;
}

export default create;
