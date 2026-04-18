describe('GET Request Complete Flow', () => {
  const testApiBase = Cypress.env('TEST_API_BASE') || 'https://httpbin.org'

  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visitHome()
  })

  it('should load the request editor page', () => {
    cy.url().should('include', 'localhost')
    cy.contains('GET').should('be.visible')
    cy.contains('Send').should('be.visible')
  })

  it('should display URL input field', () => {
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .should('exist')
      .and('be.visible')
  })

  it('should input a GET request URL', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)
      .should('have.value', testUrl)
  })

  it('should send a GET request and receive response', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
    cy.contains('OK').should('be.visible')
  })

  it('should send GET request with query parameters', () => {
    const testUrl = `${testApiBase}/get?foo=bar&name=test`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('foo').should('be.visible')
    cy.contains('bar').should('be.visible')
  })

  it('should display response headers', () => {
    const testUrl = `${testApiBase}/response-headers?Content-Type=application/json&X-Custom-Header=test-value`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('Headers').click()
    cy.contains('Content-Type').should('be.visible')
  })

  it('should handle different HTTP methods', () => {
    const methods = ['GET', 'HEAD', 'OPTIONS']
    
    methods.forEach((method) => {
      cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
        if ($el.is('select')) {
          cy.get($el).select(method)
        } else {
          cy.get($el).clear().type(method)
        }
      })

      const testUrl = `${testApiBase}/${method.toLowerCase()}`
      cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
        .first()
        .clear()
        .type(testUrl)

      cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

      if (method !== 'HEAD') {
        cy.waitForResponse()
        cy.contains('200').should('be.visible')
      }
    })
  })

  it('should display response time and size', () => {
    const testUrl = `${testApiBase}/delay/1`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains(/ms|s|time/i).should('be.visible')
    cy.contains(/bytes|KB|size/i).should('be.visible')
  })
})
