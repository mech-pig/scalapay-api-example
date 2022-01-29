FROM node:16-slim AS ts-compiler
WORKDIR /usr/app/
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.prod.json ./
COPY src src
RUN npx tsc --project tsconfig.prod.json

FROM node:16-slim
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package.json /usr/app/package-lock.json /usr/app/tsconfig.prod.json ./
RUN npm install --only=production
COPY --from=ts-compiler /usr/app/dist ./dist/
ENV TS_NODE_PROJECT=tsconfig.prod.json
ENV TS_NODE_BASEURL=./dist
CMD [ "-r", "tsconfig-paths/register", "dist/index.js" ]



