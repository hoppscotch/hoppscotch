module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  collectCoverage: true,
  setupFilesAfterEnv: ["./jest.setup.ts"],
}
