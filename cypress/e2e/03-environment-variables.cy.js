describe('Environment Variables Replacement', () => {
  const testApiBase = Cypress.env('TEST_API_BASE') || 'https://httpbin.org'

  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visitHome()
  })

  it('should open environment manager', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })
  })

  it('should create a new environment', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"]').first()
      .clear()
      .type('Test Environment')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })
  })

  it('should add environment variables', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/Global|global/i, { timeout: 5000 }).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').first()
      .clear()
      .type('API_BASE')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type(testApiBase)

    cy.get('button:contains("+"), button[aria-label*="Add"], [aria-label*="add"]').first().then(($addBtn) => {
      if ($addBtn.length > 0) {
        cy.wrap($addBtn).click()
      }
    })

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').eq(1)
      .clear()
      .type('USER_ID')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').eq(1)
      .clear()
      .type('12345')
  })

  it('should replace environment variables in URL', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/Global|global/i, { timeout: 5000 }).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').first()
      .clear()
      .type('API_BASE')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type(testApiBase)

    cy.contains(/save|update/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type('{{API_BASE}}/get')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
  })

  it('should replace multiple environment variables', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/Global|global/i, { timeout: 5000 }).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').first()
      .clear()
      .type('API_BASE')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type(testApiBase)

    cy.get('button:contains("+"), button[aria-label*="Add"], [aria-label*="add"]').first().then(($addBtn) => {
      if ($addBtn.length > 0) {
        cy.wrap($addBtn).click()
      }
    })

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').eq(1)
      .clear()
      .type('ENDPOINT')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').eq(1)
      .clear()
      .type('get')

    cy.contains(/save|update/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type('{{API_BASE}}/{{ENDPOINT}}')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
  })

  it('should replace environment variables in headers', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/Global|global/i, { timeout: 5000 }).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').first()
      .clear()
      .type('AUTH_TOKEN')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type('Bearer test-token-123')

    cy.contains(/save|update/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    const testUrl = `https://${testApiBase}/headers`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Headers').click()

    cy.get('input[placeholder*="Header Name"], input[placeholder*="key"], input[placeholder*="name"]').first()
      .clear()
      .type('Authorization')
    cy.get('input[placeholder*="Header Value"], input[placeholder*="value"]').first()
      .clear()
      .type('{{AUTH_TOKEN}}')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
  })

  it('should replace environment variables in request body', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/Global|global/i, { timeout: 5000 }).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="variable"]').first()
      .clear()
      .type('USER_NAME')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type('testuser')

    cy.contains(/save|update/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('POST')
      } else {
        cy.get($el).clear().type('POST')
      }
    })

    const testUrl = `https://${testApiBase}/post`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()
    cy.contains(/json|JSON/).click()

    const jsonBody = JSON.stringify({
      username: '{{USER_NAME}}',
      timestamp: '{{$timestamp}}'
    }, null, 2)

    cy.get('textarea, .monaco-editor, [contenteditable="true"]').first().then(($editor) => {
      if ($editor.is('textarea')) {
        cy.wrap($editor).clear().type(jsonBody, { delay: 0 })
      } else if ($editor.attr('contenteditable') === 'true') {
        cy.wrap($editor).click().type(jsonBody, { delay: 0 })
      } else {
        cy.get('.monaco-editor textarea').first().clear().type(jsonBody, { delay: 0 })
      }
    })

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
  })

  it('should handle dynamic variables like $timestamp, $randomInt', () => {
    const testUrl = `https://${testApiBase}/get`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(`${testUrl}?time={{$timestamp}}')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
  })

  it('should select different environments', () => {
    cy.contains('Environment', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/env|environment/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/No Environment|None|no env/i, { timeout: 5000 }).then(($noEnv) => {
      if ($noEnv.length > 0) {
        cy.wrap($noEnv).click()
      }
    })

    cy.contains(/Global|global/i, { timeout: 5000 }).then(($global) => {
      if ($global.length > 0) {
        cy.wrap($global).click()
      }
    })
  })
})
