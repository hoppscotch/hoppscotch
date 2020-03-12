describe("Proxy disabled - local request", () => {
  it("Change default URL with query and make a request to local Cat API", () => {
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
  it("Enable proxy and make a GET request to Postwoman API", () => {
    cy.enableProxy("/?url=https://postwoman.io&path=/.netlify/functions/api")
      .get("#send")
      .click()
      .get("#response-details-wrapper", { timeout: 24000 })
      .should("be.visible")
      .should($wrapper => {
        expect($wrapper).to.contain("Hello World")
      })
  })
})
