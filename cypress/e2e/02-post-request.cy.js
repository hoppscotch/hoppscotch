describe('POST Request with Form Data and JSON Body', () => {
  const testApiBase = Cypress.env('TEST_API_BASE') || 'https://httpbin.org'

  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visitHome()
  })

  it('should select POST method', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('POST')
      } else {
        cy.get($el).clear().type('POST')
      }
    })
    
    cy.get('select[name="method"], input[id="method"]').first().should(($el) => {
      const value = $el.is('select') ? $el.val() : $el.val()
      expect(value).to.satisfy((val) => val === 'POST' || val.includes('POST'))
    })
  })

  it('should send POST request with JSON body', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('POST')
      } else {
        cy.get($el).clear().type('POST')
      }
    })

    const testUrl = `${testApiBase}/post`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()

    cy.contains(/json|JSON/).click()

    const jsonBody = JSON.stringify({
      name: 'test-user',
      email: 'test@example.com',
      active: true,
      tags: ['api', 'test', 'e2e']
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
    cy.contains('name').should('be.visible')
    cy.contains('test-user').should('be.visible')
    cy.contains('email').should('be.visible')
    cy.contains('test@example.com').should('be.visible')
  })

  it('should send POST request with application/x-www-form-urlencoded', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('POST')
      } else {
        cy.get($el).clear().type('POST')
      }
    })

    const testUrl = `${testApiBase}/post`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()

    cy.contains(/x-www-form-urlencoded|form-urlencoded|URL Encoded/i).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="name"]').first()
      .clear()
      .type('username')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type('testuser123')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
    cy.contains('username').should('be.visible')
    cy.contains('testuser123').should('be.visible')
  })

  it('should send POST request with multipart/form-data', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('POST')
      } else {
        cy.get($el).clear().type('POST')
      }
    })

    const testUrl = `${testApiBase}/post`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()

    cy.contains(/form-data|multipart|Form Data/i).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="name"]').first()
      .clear()
      .type('field1')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type('value123')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
    cy.contains('field1').should('be.visible')
    cy.contains('value123').should('be.visible')
  })

  it('should send POST request with multiple form fields', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('POST')
      } else {
        cy.get($el).clear().type('POST')
      }
    })

    const testUrl = `${testApiBase}/post`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()

    cy.contains(/x-www-form-urlencoded|form-urlencoded|URL Encoded/i).click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="name"]').first()
      .clear()
      .type('first_name')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').first()
      .clear()
      .type('John')

    cy.get('button:contains("+"), button[aria-label*="Add"], [aria-label*="add"]').first().click()

    cy.get('input[placeholder*="key"], input[placeholder*="Key"], input[placeholder*="name"]').eq(1)
      .clear()
      .type('last_name')
    cy.get('input[placeholder*="value"], input[placeholder*="Value"]').eq(1)
      .clear()
      .type('Doe')

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('200').should('be.visible')
    cy.contains('first_name').should('be.visible')
    cy.contains('John').should('be.visible')
    cy.contains('last_name').should('be.visible')
    cy.contains('Doe').should('be.visible')
  })

  it('should send PUT request with JSON body', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('PUT')
      } else {
        cy.get($el).clear().type('PUT')
      }
    })

    const testUrl = `${testApiBase}/put`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()
    cy.contains(/json|JSON/).click()

    const jsonBody = JSON.stringify({
      id: 123,
      status: 'updated',
      data: { field: 'value' }
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

  it('should send DELETE request', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('DELETE')
      } else {
        cy.get($el).clear().type('DELETE')
      }
    })

    const testUrl = `${testApiBase}/delete`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()
    cy.contains('200').should('be.visible')
  })

  it('should send PATCH request with JSON body', () => {
    cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
      if ($el.is('select')) {
        cy.get($el).select('PATCH')
      } else {
        cy.get($el).clear().type('PATCH')
      }
    })

    const testUrl = `${testApiBase}/patch`
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains('Body').click()
    cy.contains(/json|JSON/).click()

    const jsonBody = JSON.stringify({ op: 'replace', path: '/name', value: 'newname' }, null, 2)

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
})
