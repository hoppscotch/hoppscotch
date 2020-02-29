describe("Proxy disabled - local request", () => {
  it("Change default url with query and make a request to local cat api", () => {
    cy.seedAndVisit("catapi", "/?url=https://api.thecatapi.com&path=")
      .get("#url")
      .then(el => expect(el.val() === "https://api.thecatapi.com").to.equal(true))
      .get("#response-details-wrapper")
      .should("be.visible")
      .should($wrapper => {
        expect($wrapper).to.contain("FAKE Cat API")
      })
  })
})

describe("Proxy enabled - external request", () => {
  it("Enable the proxy and make a request to the real cat api", () => {
    cy.enableProxy("/?url=https://api.thecatapi.com&path=")
      .get("#send")
      .click()
      .get("#response-details-wrapper", { timeout: 24000 })
      .should("be.visible")
      .should($wrapper => {
        expect($wrapper).to.contain("The Cat API")
      })
  })
})
