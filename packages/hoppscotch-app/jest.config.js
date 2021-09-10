module.exports = {
  moduleFileExtensions: ["ts", "js", "json", "vue"],
  watchman: false,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^~/(.*)$": "<rootDir>/$1",
    "^vue$": "vue/dist/vue.common.js",
  },
  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": "babel-jest",
    ".*\\.(vue)$": "vue-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  snapshotSerializers: ["jest-serializer-vue"],
  collectCoverage: true,
  testURL: "http://localhost/",
  preset: "ts-jest/presets/js-with-babel",
  testEnvironment: "jsdom",
}
