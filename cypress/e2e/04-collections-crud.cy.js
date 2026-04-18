describe('Collections CRUD Operations', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.visitHome()
  })

  it('should open collections panel', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })
  })

  it('should create a new collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('Test Collection')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('Test Collection').should('be.visible')
  })

  it('should add a request to a collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('API Collection')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('API Collection').should('be.visible').click()

    cy.contains(/add request|new request/i, { timeout: 5000 }).then(($addReq) => {
      if ($addReq.length > 0) {
        cy.wrap($addReq).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="request"]').first()
      .clear()
      .type('Get Users')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('Get Users').should('be.visible')
  })

  it('should edit a collection name', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('Old Name')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('Old Name').should('be.visible').rightclick()

    cy.contains(/edit|rename/i, { timeout: 3000 }).then(($editBtn) => {
      if ($editBtn.length > 0) {
        cy.wrap($editBtn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"]').first()
      .clear()
      .type('New Name')

    cy.contains(/save|update/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('New Name').should('be.visible')
  })

  it('should delete a collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('To Delete')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('To Delete').should('be.visible').rightclick()

    cy.contains(/delete|remove/i, { timeout: 3000 }).then(($deleteBtn) => {
      if ($deleteBtn.length > 0) {
        cy.wrap($deleteBtn).click()
      }
    })

    cy.contains(/confirm|yes|delete/i, { timeout: 3000 }).then(($confirm) => {
      if ($confirm.length > 0) {
        cy.wrap($confirm).click()
      }
    })
  })

  it('should create a folder in a collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('With Folder')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('With Folder').should('be.visible').click()

    cy.contains(/add folder|new folder/i, { timeout: 5000 }).then(($addFolder) => {
      if ($addFolder.length > 0) {
        cy.wrap($addFolder).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="folder"]').first()
      .clear()
      .type('Users Folder')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('Users Folder').should('be.visible')
  })

  it('should duplicate a collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('Original')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('Original').should('be.visible').rightclick()

    cy.contains(/duplicate|copy/i, { timeout: 3000 }).then(($dupBtn) => {
      if ($dupBtn.length > 0) {
        cy.wrap($dupBtn).click()
      }
    })

    cy.contains(/Original.*copy|copy.*Original/i).should('be.visible')
  })

  it('should export a collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/new|add|create/i, { timeout: 5000 }).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn).click()
      }
    })

    cy.get('input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="collection"]').first()
      .clear()
      .type('Export Me')

    cy.contains(/save|create|add/i).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains('Export Me').should('be.visible').rightclick()

    cy.contains(/export/i, { timeout: 3000 }).then(($exportBtn) => {
      if ($exportBtn.length > 0) {
        cy.wrap($exportBtn).click()
      }
    })
  })

  it('should import a collection', () => {
    cy.contains('Collections', { timeout: 10000 }).then(($el) => {
      if ($el.length > 0) {
        cy.wrap($el).click()
      } else {
        cy.contains(/collection/i, { timeout: 10000 }).click()
      }
    })

    cy.contains(/import/i, { timeout: 5000 }).then(($importBtn) => {
      if ($importBtn.length > 0) {
        cy.wrap($importBtn).click()
      }
    })

    cy.contains(/file|url/i, { timeout: 3000 }).should('be.visible')
  })

  it('should save current request to collection', () => {
    const testUrl = 'https://httpbin.org/get'
    
    cy.get('input[placeholder*="URL"], input[placeholder*="url"], input[placeholder*="Enter request"]')
      .first()
      .clear()
      .type(testUrl)

    cy.contains(/save/i, { timeout: 5000 }).then(($saveBtn) => {
      if ($saveBtn.length > 0) {
        cy.wrap($saveBtn).click()
      }
    })

    cy.contains(/save as|save to collection/i, { timeout: 3000 }).then(($saveAs) => {
      if ($saveAs.length > 0) {
        cy.wrap($saveAs).click()
      }
    })
  })
})
