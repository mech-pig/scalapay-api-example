# These values are meant for development purposes.
# Beware not to expose credentials or other sensitive data!
# https://developers.scalapay.com/reference/api-simulator
SCALAPAY_BASE_URL = https://staging.api.scalapay.com
SCALAPAY_AUTH_TOKEN = qhtfs87hjnc12kkos
SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL = https://portal.staging.scalapay.com/success-url
SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL = https://portal.staging.scalapay.com/failure-url

ENV_VARS = \
	SCALAPAY_BASE_URL=$(SCALAPAY_BASE_URL) \
	SCALAPAY_AUTH_TOKEN=$(SCALAPAY_AUTH_TOKEN) \
	SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL=$(SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL) \
	SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL=$(SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL)

.PHONY: install-dev
install-dev:
	npm i

.PHONY: dev
dev: install-dev
	@$(ENV_VARS) npx ts-node-dev -r tsconfig-paths/register src/index.ts | npx pino-pretty

.PHONY: format
format:
	npx prettier --write .

.PHONY: check
check:
	npx prettier --check .
	npx tsc --noEmit

.PHONY: test
test:
	npx jest

.PHONY: build
build:
	npx tsc --project tsconfig.prod.json

.PHONY: run
run: build
	TS_NODE_PROJECT=tsconfig.prod.json TS_NODE_BASEURL=./dist node -r tsconfig-paths/register dist/index.js

.PHONY: docker-run
docker-run:
	@docker build -t ts:local .
	@# using --init because the default command `node`
	@# does not handle signals
	@# see https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
	@docker run --init --rm \
		-e SCALAPAY_BASE_URL=$(SCALAPAY_BASE_URL) \
		-e SCALAPAY_AUTH_TOKEN=$(SCALAPAY_AUTH_TOKEN) \
		-e SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL=$(SCALAPAY_MERCHANT_REDIRECT_SUCCESS_URL) \
		-e SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL=$(SCALAPAY_MERCHANT_REDIRECT_FAILURE_URL) \
		-p 8080:8080 \
		ts:local

.PHONY: env-up
env-up:
	@$(ENV_VARS) docker-compose up -d

.PHONY: env-down
env-down:
	@$(ENV_VARS) docker-compose down

.PHONY: env-logs
env-logs:
	@$(ENV_VARS) docker-compose logs -f