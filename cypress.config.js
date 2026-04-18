const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1920,
    viewportHeight: 1080,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 30000,
  },
  env: {
    TEST_API_BASE: 'https://httpbin.org',
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
  video: true,
  screenshotsOnRunFailure: true,
})
