describe('Visit home', () => {
  it('Have a page title with "Postwoman"', () => {
    cy.visit('/')
      .get('title')
      .should('contain','Postwoman')
  })
})
