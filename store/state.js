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
  ws: {
    url: "wss://echo.websocket.org",
    message: "",
    log: [],
    socket: null,
  },
  eventSource: {
    server: "https://express-eventsource.herokuapp.com/events",
    sse: null,
    log: [],
  },
  socketIO: {
    url: "wss://main-daxrc78qyb411dls-gtw.qovery.io",
    path: "/socket.io",
    socket: null,
    log: [],
    eventName: "",
    inputs: [],
  },
  mqtt: {
    url: "wss://test.mosquitto.org:8081",
    client: null,
    pub_topic: "",
    sub_topic: "",
    msg: "",
    log: [],
  },
  gql: {
    url: "https://rickandmortyapi.com/graphql",
    headers: [],
    schema: "",
    variablesJSONString: '{ "id": "1" }',
    query: `query GetCharacter($id: ID!) {
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
  name: "Hoppscotch",
})
