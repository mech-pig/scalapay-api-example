import createHttpServer from "@entrypoints/http";
import createApplication from "@domain/application";

const application = createApplication();
const server = createHttpServer(application).listen(8080, () =>
  console.log("Server listenning on port 8080"),
);

export default server;
