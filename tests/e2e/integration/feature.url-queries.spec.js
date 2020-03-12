describe("Authentication", () => {
  it(`Change default Auth username and password with URL`, () => {
    cy.visit(`?&auth=Basic Auth&httpUser=foo&httpPassword=bar`, { retryOnStatusCodeFailure: true })
      .get('input[name="http_basic_user"]', { timeout: 500 })
      .invoke("val")
      .then(user => {
        expect(user === "foo").to.equal(true)
      })

      .get('input[name="http_basic_passwd"]')
      .invoke("val")
      .then(pass => {
        expect(pass === "bar").to.equal(true)
      })
  })

  it("Enable username and password in URL with toggler", () => {
    cy.visit("/", { retryOnStatusCodeFailure: true })
      .get("#auth")
      .select("Basic Auth")
      .get('input[name="http_basic_user"]', { timeout: 500 })
      .type("foo")
      .get('input[name="http_basic_passwd"]', { timeout: 500 })
      .type("bar")
      .url()
      .should("not.contain", "foo")
      .should("not.contain", "bar")
      .get(".toggle")
      .click()
      .url()
      .should("contain", "foo")
      .should("contain", "bar")
  })
})
