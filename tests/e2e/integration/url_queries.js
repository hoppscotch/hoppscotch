describe('Methods', () => {
  const methods = ['POST', 'HEAD', 'POST', 'PUT', 'DELETE','OPTIONS', 'PATCH']
  methods.forEach(method => {
      it(`Change the default method GET to ${method} with url query`, () => {
        cy.visit(`/?method=${method}`)
        cy.get('#method').contains(method)
      })
  })
})

describe('Url and path', () => {
  it('Change default url with query and reset default path to empty string and make a request', () => {
    cy.visit('/?url=https://api.thecatapi.com&path=')
      .get('#url').then(el => expect(el.val() === 'https://api.thecatapi.com').to.equal(true))
      .get("#path").then(el => expect(el.val() === '').to.equal(true))
  })
})

describe('Authentication', () => {
  it(`Change default auth 'None' to 'Basic' and set httpUser and httpPassword with url query`, () => {
    cy
      .visit(`/?auth=Basic&httpUser=foo&httpPassword=bar`)
      .get('#authentication').contains('Authentication').click()
      .get('label').contains('User')
      .get('#authentication').then(el => expect(el.children().find('input').val() === 'foo').to.equal(true))
  })

  const base64Tkn = encodeURI(btoa('{"alg":"HS256", "typ": "JWT"}'))

  it(`Change default auth 'None' to 'Bearer token' and set bearerToken with url query`, () => {
    cy
      .visit(`/?auth=Bearer Token&bearerToken=${base64Tkn}`)
      .get('#authentication').contains('Authentication').click()
      .get('label').contains('Token')
      .get('#authentication').then(el => expect(el.children().find('input').val() === base64Tkn).to.equal(true))
  })
})
