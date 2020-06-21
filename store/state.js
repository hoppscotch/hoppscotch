export default () => ({
  request: {
    method: "GET",
    uri: "",
    url: "https://httpbin.org",
    path: "/get",
    label: "",
    auth: "None",
    httpUser: "",
    httpPassword: "",
    passwordFieldType: "password",
    bearerToken: "",
    headers: [],
    params: [],
    bodyParams: [],
    rawParams: "",
    rawInput: false,
    requestType: "",
    contentType: "",
  },
  gql: {
    url: "https://rickandmortyapi.com/graphql",
    headers: [],
    schema: "",
    variablesJSONString: '{ "id": "1" }',
    query: `query GetCharacter($id: ID) {
  character(id: $id) {
    id
    name
  }
}`,
    response: "",
    schemaIntrospection: "",
  },
  theme: {
    collapsedSections: [],
  },
  oauth2: {
    tokens: [],
    tokenReqs: [],
    tokenReqSelect: "",
    tokenReqName: "",
    accessTokenName: "",
    oidcDiscoveryUrl: "",
    authUrl: "",
    accessTokenUrl: "",
    clientId: "",
    scope: "",
  },
  name: "Postwoman",
})
