export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  collectCoverage: true,
  setupFilesAfterEnv: ["./jest.setup.ts"],
  moduleNameMapper: {
    "~/(.*)": "<rootDir>/src/$1",
    "^lodash-es$": "lodash",
  },
}
