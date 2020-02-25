describe("Proxy disabled - local request", () => {
  it("Change default url with query and make a request to local cat api", () => {
    cy.seedAndVisit("catapi", "/?url=https://api.thecatapi.com&path=")
      .get("#url")
      .then(el => expect(el.val() === "https://api.thecatapi.com").to.equal(true))
      .get("#path")
      .then(el => expect(el.val() === "").to.equal(true))
      .get("#response-details-wrapper")
      .should($wrapper => {
        expect($wrapper).to.contain("FAKE Cat API")
      })
  })
})

describe('Proxy enabled - external request', () => {
  it('Enable the proxy and make a request to the real cat api', () => {
    cy.enableProxy('/?url=https://api.thecatapi.com&path=')
      .get('#send').click()
      .wait(500)
      .get('#response-details-wrapper').should($wrapper => {
        expect($wrapper).to.contain('Cat API')
      })
  })
})
