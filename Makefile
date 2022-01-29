ENV_VARS =
DEV_ENV_VARS = $(ENV_VARS)

.PHONY: install-dev
install-dev:
	npm i

.PHONY: dev
dev: install-dev
	@$(DEV_ENV_VARS) npx ts-node-dev -r tsconfig-paths/register src/index.ts

.PHONY: test
test: install-dev
	npx jest

.PHONY: format
format:
	npx prettier --write .

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
	@docker run --init --rm ts:local

.PHONY: env-up
env-up:
	@$(ENV_VARS) docker-compose up -d

.PHONY: env-down
env-down:
	@$(ENV_VARS) docker-compose down

.PHONY: env-logs
env-logs:
	@$(ENV_VARS) docker-compose logs -f