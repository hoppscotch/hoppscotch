/**
* Creates cy.seedAndVisit() function
* This function will go to some path and wait for some fake response from 'src/tests/fixtures/*.json'
* @param { String } seedData The name of json at 'src/tests/fixtures/
* @param { String } path The path or query parameters to go -ex. '/?path=/api/users'
* @param { String } method The fake request method
*/
Cypress.Commands.add('seedAndVisit', (seedData, path = '/', method = 'GET') => {
  cy.server()
    .route(method, 'https://api.thecatapi.com/', `fixture:${seedData}`).as(
    'load'
  )
  cy.visit(path)
    .get('#send').click()
    .wait('@load')
})