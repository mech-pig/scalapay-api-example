import supertest from "supertest";
import createApplication, { Application } from "@domain/application";
import createHttpServer from "@entrypoints/http";

function testClient(overrides: Partial<Application> = {}) {
  const application = createApplication();
  const testApplication = { ...application, ...overrides };
  const server = createHttpServer(testApplication);
  return supertest(server);
}

describe("createOrder", () => {
  test("dummy", async () => {
    const body = {
      shipping: {
        name: "test",
        address: {
          countryCode: "IT",
          city: "Milano",
          postCode: "20100",
          addressLine: "Vicolo Stretto, 1",
        },
      },
    };
    const response = await testClient().post("/orders").send(body);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ id: "test" });
  });
});
