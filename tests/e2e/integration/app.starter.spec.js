describe('Visit home', () => {
  it('Have a page title with "Postwoman"', () => {
    cy.visit('/')
      .title()
      .should('contain','Postwoman')
  })
})
