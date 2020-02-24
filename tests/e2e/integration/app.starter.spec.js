describe('Visit home', () => {
  it('Have a page title with "Postwoman"', () => {
    cy.visit('/', { retryOnStatusCodeFailure: true })
      .get('title')
      .should('contain', 'Postwoman')
  })
})
