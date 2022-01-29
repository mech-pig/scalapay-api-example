/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.prod");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  bail: 3,
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{ts,js}"],
  errorOnDeprecated: true,
  // https://kulshekhar.github.io/ts-jest/docs/getting-started/paths-mapping
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/src",
  }),
};
