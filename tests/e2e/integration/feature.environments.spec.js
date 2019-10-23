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