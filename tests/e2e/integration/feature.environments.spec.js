describe('Environment Section', () => {
  const testEnvironment = `
    {
      "api": "https://reqres.in",
      "secret": "pssst... this is a secret",
      "user": "552361f2733ede180092b5f5"
    }
  `;

  it('should insert an environment into the raw input field', () => {
    cy.visit(`/`)
      .get('#environmentRawInputToggle').click()
      .then(() => {
        cy.get('#environmentRawBody')
          .type(testEnvironment)
          .then(() => {
            cy.get('#environmentRawBody')
              .then(el => el.val() === testEnvironment)
          });
      });
  });

  it('should add a new environment property from the add property button', () => {
    cy.visit(`/`)
      .then(() => {
        cy.get('#addEnvironmentProperty')
          .click()
          .then(() => {
            cy.get('#envKey0')
              .then(el => el.val() === '')
            cy.get('#envVal0')
              .then(el => el.val() === '')
          });
      });
  });

  it('should clear all environment properties using the clear all button', () => {
    cy.visit(`/`)
      .then(() => {
        cy.get('#addEnvironmentProperty')
          .click()
          .then(() => {
            cy.get('#environmentClearContent').click()
              .then(() => {
                cy.get('#envKey0')
                  .should('not.exist')
              })
          });
      });
  });
})

// describe('Url and path', () => {
//   it('Change default url with query and reset default path to empty string and make a request to cat api', () => {
//       cy.seedAndVisit('catapi', '/?url=https://api.thecatapi.com&path=')
//       .get('#url').then(el => expect(el.val() === 'https://api.thecatapi.com').to.equal(true))
//       .get("#path").then(el => expect(el.val() === '').to.equal(true))
//       .get('#response-details-wrapper').should($wrapper => {
//         expect($wrapper).to.contain('FAKE Cat API')
//       })
//   })
// })

// describe('Authentication', () => {
//   it(`Change default auth 'None' to 'Basic' and set httpUser and httpPassword with url query`, () => {
//     cy.visit(`?&auth=Basic&httpUser=foo&httpPassword=bar`, { retryOnStatusCodeFailure: true })
//       .get('#authentication').contains('Authentication').click()
//         .then(() => { 
//           cy.get('input[name="http_basic_user"]', { timeout: 500 })
//             .invoke('val')
//             .then(user => {
//               expect(user === 'foo').to.equal(true)
//               cy.log('Success! user === foo')
//             })

//           cy.get('input[name="http_basic_passwd"]')
//             .invoke('val')
//             .then(user => { 
//               expect(user === 'bar').to.equal(true)
//               cy.log('Success! password === bar')
//             })
//         })
//   })

//   const base64Tkn = encodeURI(btoa('{"alg":"HS256", "typ": "JWT"}'))

//   it(`Change default auth 'None' to 'Bearer token' and set bearerToken with url query`, () => {
//     cy.visit(`/?auth=Bearer Token&bearerToken=${base64Tkn}`, { retryOnStatusCodeFailure: true })
//         .get('#authentication').contains('Authentication').click()
//           .then(() => {
//             cy.get('input[name="bearer_token"]', { timeout: 500 })
//               .invoke('val')
//               .then(tkn => {
//                 expect(tkn === base64Tkn).to.equal(true)
//                 cy.log(`Success! input[name="bearer_token"] === ${base64Tkn}`)
//               })
//           })
//   })
// })
