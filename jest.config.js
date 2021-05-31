module.exports = {
  moduleFileExtensions: ["ts", "js", "json", "vue"],
  watchman: false,
  moduleNameMapper: {
    ".+\\.(svg)\\?inline$": "<rootDir>/__mocks__/svgMock.js",
    "^~/(.*)$": "<rootDir>/$1",
    "^~~/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.js$": "babel-jest",
    ".*\\.(vue)$": "vue-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  snapshotSerializers: ["jest-serializer-vue"],
  collectCoverage: true,
  collectCoverageFrom: [
    "<rootDir>/components/**/*.vue",
    "<rootDir>/pages/*.vue",
  ],
  testURL: "http://localhost/",
  preset: "ts-jest/presets/js-with-babel",
  testEnvironment: "jsdom",
}
