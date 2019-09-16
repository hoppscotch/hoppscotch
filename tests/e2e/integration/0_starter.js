import { timeout } from "q"

describe('Visit home', () => {
  it('Have a page title with "Postwoman"', () => {
    cy.visit('/', { 
      retryOnStatusCodeFailure: true, 
      timeout: 30000 // due to ci surge deployment added this big timeout
    })
      .get('title')
      .should('contain','Postwoman')
  })
})
