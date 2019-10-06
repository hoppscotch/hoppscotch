describe('Methods', () => {
  const methods = [ 'POST', 'HEAD', 'POST', 'PUT', 'DELETE','OPTIONS', 'PATCH']
  methods.forEach(method => {
      it(`Change the default method GET to ${method} with url query`, () => {
        cy.visit(`/?method=${method}`)
          .get('#method').contains(method)
      })
  })
})

describe('Url and path', () => {
  it('Change default url with query and reset default path to empty string and make a request to cat api', () => {
      cy.seedAndVisit('catapi', '/?url=https://api.thecatapi.com&path=')
      .get('#url').then(el => expect(el.val() === 'https://api.thecatapi.com').to.equal(true))
      .get("#path").then(el => expect(el.val() === '').to.equal(true))
      .get('#response-details-wrapper').should($wrapper => {
        expect($wrapper).to.contain('FAKE Cat API')
      })
  })
})

describe('Authentication', () => {
  it(`Change default auth 'None' to 'Basic' and set httpUser and httpPassword with url query`, () => {
    cy.visit(`?&auth=Basic&httpUser=foo&httpPassword=bar`, { retryOnStatusCodeFailure: true })
      .get('#authentication').contains('Authentication').click()
        .then(() => { 
          cy.get('input[name="http_basic_user"]', { timeout: 500 })
            .invoke('val')
            .then(user => {
              expect(user === 'foo').to.equal(true)
              cy.log('Success! user === foo')
            })

          cy.get('input[name="http_basic_passwd"]')
            .invoke('val')
            .then(user => { 
              expect(user === 'bar').to.equal(true)
              cy.log('Success! password === bar')
            })
        })
  })

  const base64Tkn = encodeURI(btoa('{"alg":"HS256", "typ": "JWT"}'))

  it(`Change default auth 'None' to 'Bearer token' and set bearerToken with url query`, () => {
    cy.visit(`/?auth=Bearer Token&bearerToken=${base64Tkn}`, { retryOnStatusCodeFailure: true })
        .get('#authentication').contains('Authentication').click()
          .then(() => {
            cy.get('input[name="bearer_token"]', { timeout: 500 })
              .invoke('val')
              .then(tkn => {
                expect(tkn === base64Tkn).to.equal(true)
                cy.log(`Success! input[name="bearer_token"] === ${base64Tkn}`)
              })
          })
  })
})
