# Scalapay API example

A small application to test the [Scalapay API](https://developers.scalapay.com/reference/get-started-with-our-apis). This typescript, express-powered app simulates an e-commerce api that allow users to create orders and redirects them to Scalapay for the checkout.

## Quickstart

A Dockerfile is provided to test the api without installing anything on the host. You can start the server with the following command:

```sh
make docker-run
```

By default, the application will start listening for http requests on port 8080 and it's configured to use the [Scalapay API Simulator](https://developers.scalapay.com/reference/api-simulator). You can inspect the Makefile to verify the app configuration.

You can find some examples of payloads in the `examples` folder. You can test the app using your favorite command-line http client.
This is an example for [httpie](https://httpie.io/) that shows how to create an order:

```sh
http POST :8080/orders < examples/create-order.json
```

On success, a redirect url is returned to complete the checkout on Scalapay.

```sh
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 73
Content-Type: application/json; charset=utf-8
Date: Sun, 06 Feb 2022 23:58:34 GMT
ETag: W/"49-U0ID7A41ptH5M8liU3F1ScaQ3TU"
Keep-Alive: timeout=5
X-Powered-By: Express
{
    "checkoutUrl": "https://portal.staging.scalapay.com/checkout/F1KZBXEWAD"
}
```

The list of available products can be obtained with:

```sh
http GET :8080/products
```

## Configuration

Configuration can be provided via the following environment variables:

| var                                      | value                                                                                                                                    | example                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `SCALAPAY_BASE_URL`                      | url of the target [API environment](https://developers.scalapay.com/reference/get-started-with-our-apis)                                 | https://api.api.scalapay.com                    |
| `SCALAPAY_AUTH_TOKEN`                    | [bearer authentication token](https://developers.scalapay.com/reference/api-authentication) to authenticate requests to the Scalapay api |
| `SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL` | url used by Scalapay to redirect users to after a successful checkout                                                                    | https://portal.staging.scalapay.com/success-url |
| `SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL` | url used by Scalapay to redirect users to after an unsuccessful checkout                                                                 | https://portal.staging.scalapay.com/failure-url |

## API Reference

### `GET /products`

Retrieve the list of available products.

#### Response

##### `200 Ok`

| field                        | type     | description                                                                    |
| ---------------------------- | -------- | ------------------------------------------------------------------------------ |
| `items`                      | object[] |                                                                                |
| `items[*].sku`               | string   | The Stock keeping unit code of the product.                                    |
| `items[*].gtin`              | string   | Global Trade Item Number of the product                                        |
| `items[*].name`              | string   | Product name                                                                   |
| `items[*].brand`             | string   | Product brand                                                                  |
| `items[*].category`          | string   | Product category                                                               |
| `items[*].netUnitPriceInEur` | string   | Product net unit price in EUR currency                                         |
| `items[*].vat`               | integer  | Value added tax that will be applied, expressed as percentage of the net price |

example:

```json
{
  "items": [
    {
      "brand": "acme",
      "category": "clothes",
      "gtin": "0400939035768",
      "name": "product-0",
      "netUnitPriceInEur": "8.19",
      "sku": "0",
      "vat": 22
    },
    {
      "brand": "acme",
      "category": "electronic",
      "gtin": "1400939035767",
      "name": "product-1",
      "netUnitPriceInEur": "17.54",
      "sku": "1",
      "vat": 22
    },
    {
      "brand": "acme",
      "category": "home",
      "gtin": "2400939035766",
      "name": "product-2",
      "netUnitPriceInEur": "1.12",
      "sku": "2",
      "vat": 22
    }
  ]
}
```

### `POST /orders`

Creates an order and starts the checkout.

#### Request

| field                          | required | type     | description                            |
| ------------------------------ | -------- | -------- | -------------------------------------- |
| `user`                         | yes      | object   | Info about the user creating the order |
| `user.firstName`               | yes      | string   | First (and middle) name(s)             |
| `user.lastName`                | yes      | string   | Last name                              |
| `user.phoneNumber`             | no       | string   | Phone number                           |
| `shipping`                     | yes      | object   | Shipping details                       |
| `shipping.name`                | yes      | string   | Name                                   |
| `shipping.phoneNumber`         | no       | string   | Phone number                           |
| `shipping.address`             | yes      | object   | Shipping address                       |
| `shipping.address.countryCode` | yes      | string   | Country code                           |
| `shipping.address.city`        | yes      | string   | City                                   |
| `shipping.address.postCode`    | yes      | string   | Postal code                            |
| `shipping.address.addressLine` | yes      | string   | Address line                           |
| `billing`                      | no       | object   | Billing details                        |
| `billing.name`                 | no       | string   | Name                                   |
| `billing.phoneNumber`          | no       | string   | Phone number                           |
| `billing.address`              | no       | object   | Billing address                        |
| `billing.address.countryCode`  | yes      | string   | Country code                           |
| `billing.address.city`         | yes      | string   | City                                   |
| `billing.address.postCode`     | yes      | string   | Postal code                            |
| `billing.address.addressLine`  | yes      | string   | Address line                           |
| `items`                        | yes      | object[] | Order items (must not be empty)        |
| `items[*].sku`                 | yes      | string   | Product sku (values must not repeat)   |
| `items[*].quantity`            | yes      | integer  | Quantity                               |

example

```json
{
  "user": {
    "firstName": "First",
    "lastName": "Last",
    "phoneNumber": "+0 123 456789"
  },
  "shipping": {
    "name": "Peter Griffin",
    "phoneNumber": "+1 234 567890",
    "address": {
      "countryCode": "US",
      "city": "Quahog",
      "postCode": "00000",
      "addressLine": "31 Spooner Street"
    }
  },
  "billing": {
    "name": "Homer J. Simpson",
    "phoneNumber": "+2 345 678901",
    "address": {
      "countryCode": "US",
      "city": "Springfield",
      "postCode": "00000",
      "addressLine": "742 Evergreen Terrace"
    }
  },
  "items": [
    {
      "sku": "0",
      "quantity": 3
    }
  ]
}
```

#### Response

##### `200 Ok`

| field         | type   | description                           |
| ------------- | ------ | ------------------------------------- |
| `checkoutUrl` | string | Redirect url to complete the checkout |

example:

```json
{
  "checkoutUrl": "https://portal.staging.scalapay.com/checkout/91KZDFM8V5"
}
```

##### `400 Bad Request`

###### `UnavailableProducts`

| field  | type                  | description                    |
| ------ | --------------------- | ------------------------------ |
| `type` | `UnavailableProducts` |                                |
| `skus` | string[]              | Skus of not available products |

###### `DuplicateItems`

| field  | type             | description    |
| ------ | ---------------- | -------------- |
| `type` | `DuplicateItems` |                |
| `skus` | string[]         | Duplicate skus |

##### `422 Unprocessable Entity`

- The request body does not conform to the expected schema.

##### `500 Internal Server Error`

- An unexpected error occurred.
