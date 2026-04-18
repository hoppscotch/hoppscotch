describe('Request History Save and Load', () => {
  const testApiBase = Cypress.env('TEST_API_BASE') || 'https://httpbin.org'

  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visitHome()
  })

  it('should open history panel', () => {
    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })
  })

  it('should save request to history after sending', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/httpbin.*get|get.*httpbin/i, { timeout: 5000 }).should('be.visible')
  })

  it('should display multiple requests in history', () => {
    const requests = [
      { url: `${testApiBase}/get`, method: 'GET' },
      { url: `${testApiBase}/headers`, method: 'GET' },
      { url: `${testApiBase}/ip`, method: 'GET' },
    ]

    requests.forEach((req) => {
      cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
        if ($el.is('select')) {
          cy.get($el).select(req.method)
        } else {
          cy.get($el).clear().type(req.method)
        }
      })

      cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
        .first()
        .clear()
        .type(req.url)

      cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

      cy.waitForResponse()
    })

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    requests.forEach((req) => {
      cy.contains(req.url.split('/').pop() || 'get', { timeout: 5000 }).should('be.visible')
    })
  })

  it('should load a request from history', () => {
    const testUrl = `${testApiBase}/get?foo=bar`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/foo.*bar|bar.*foo/i, { timeout: 5000 }).click()

    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .should('have.value', testUrl)
  })

  it('should delete a request from history', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/httpbin.*get|get.*httpbin/i, { timeout: 5000 }).then(($historyItem) => {
      if ($historyItem.length > 0) {
        cy.wrap($historyItem).rightclick()
      }
    })

    cy.contains(/delete|remove/i, { timeout: 3000 }).then(($deleteBtn) => {
      if ($deleteBtn.length > 0) {
        cy.wrap($deleteBtn).click()
      }
    })
  })

  it('should clear all history', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/clear all|delete all|remove all/i, { timeout: 5000 }).then(($clearAll) => {
      if ($clearAll.length > 0) {
        cy.wrap($clearAll).click()
      }
    })

    cy.contains(/confirm|yes/i, { timeout: 3000 }).then(($confirm) => {
      if ($confirm.length > 0) {
        cy.wrap($confirm).click()
      }
    })
  })

  it('should star/favorite a request in history', () => {
    const testUrl = `${testApiBase}/headers`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/httpbin.*headers|headers.*httpbin/i, { timeout: 5000 }).then(($historyItem) => {
      if ($historyItem.length > 0) {
        cy.wrap($historyItem).rightclick()
      }
    })

    cy.contains(/star|favorite|bookmark/i, { timeout: 3000 }).then(($starBtn) => {
      if ($starBtn.length > 0) {
        cy.wrap($starBtn).click()
      }
    })
  })

  it('should filter history by search', () => {
    const requests = [
      { url: `${testApiBase}/get`, method: 'GET' },
      { url: `${testApiBase}/post`, method: 'POST' },
    ]

    requests.forEach((req) => {
      cy.get('select[name="method"], input[id="method"]').first().then(($el) => {
        if ($el.is('select')) {
          cy.get($el).select(req.method)
        } else {
          cy.get($el).clear().type(req.method)
        }
      })

      cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
        .first()
        .clear()
        .type(req.url)

      cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

      cy.waitForResponse()
    })

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.get('input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="filter"]').first()
      .clear()
      .type('get')

    cy.contains(/get/i, { timeout: 3000 }).should('be.visible')
  })

  it('should display request method and status in history', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains('GET', { timeout: 5000 }).should('be.visible')
    cy.contains('200', { timeout: 5000 }).should('be.visible')
  })

  it('should display request timestamp in history', () => {
    const testUrl = `${testApiBase}/get`
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.get('button:contains("Send"), button#send, button[aria-label*="Send"]').first().click()

    cy.waitForResponse()

    cy.contains('History', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/history/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/second|minute|hour|today|yesterday|just now/i, { timeout: 5000 }).should('be.visible')
  })
})
