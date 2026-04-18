Cypress.Commands.add('visitHome', () => {
  cy.visit('/')
  cy.wait(2000)
})

Cypress.Commands.add('inputURL', (url) => {
  cy.get('input[placeholder*="Enter request URL"], input[placeholder*="url"]').first().clear().type(url)
})

Cypress.Commands.add('selectMethod', (method) => {
  cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
    if ($el.is('select')) {
      cy.get($el).select(method)
    } else {
      cy.get($el).clear().type(method)
    }
  })
})

Cypress.Commands.add('clickSend', () => {
  cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()
})

Cypress.Commands.add('waitForResponse', () => {
  cy.contains(/status|response|Status/i, { timeout: 30000 }).should('be.visible')
})

Cypress.Commands.add('selectBodyType', (type) => {
  cy.contains('Body').click()
  cy.contains(type).click()
})

Cypress.Commands.add('addHeader', (key, value) => {
  cy.contains('Headers').click()
  cy.get('input[placeholder*="Header Name"], input[placeholder*="key"]').first().type(key)
  cy.get('input[placeholder*="Header Value"], input[placeholder*="value"]').first().type(value)
})

Cypress.Commands.add('openEnvironments', () => {
  cy.contains('Environment', { timeout: 5000 }).click()
})

Cypress.Commands.add('openCollections', () => {
  cy.contains('Collections', { timeout: 5000 }).click()
})

Cypress.Commands.add('openHistory', () => {
  cy.contains('History', { timeout: 5000 }).click()
})
