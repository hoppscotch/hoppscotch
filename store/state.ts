export interface KeyValuePair<K, V> {
  key: K;
  value: V;
}
export interface RequestState {
  method: string;
  url: string;
  path: string;
  label: string;
  auth: string;
  httpUser: string;
  httpPassword: string;
  passwordFieldType: string;
  bearerToken: string;
  headers: KeyValuePair<string, string>[];
  params: KeyValuePair<string, string>[];
  bodyParams: KeyValuePair<string, string>[];
  rawParams: string;
  rawInput: boolean;
  requestType: string;
  contentType: string;

  [key: string]: any;
}

export interface OAuth2State {
  tokens: any[];
  tokenReqs: any[];
  tokenReqSelect: string;
  accessTokenName: string;
  oidcDiscoveryUrl: string;
  authUrl: string;
  accessTokenUrl: string;
  clientId: string;
  scope: string;

  [key: string]: any;
}

export interface GQLState {
  url: string;
  headers: KeyValuePair<string, string>[];
  variables: KeyValuePair<string, string>[];
  query: string;

  [key: string]: any;
}

interface EditorState {
  request: RequestState;
  gql: GQLState;
  oauth2: OAuth2State;
}


export default () => (<EditorState>{
  request: {
    method: "GET",
    url: "https://reqres.in",
    path: "/api/users",
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
    contentType: ""
  },
  gql: {
    url: "https://rickandmortyapi.com/graphql",
    headers: [],
    variables: [],
    query: ""
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
    scope: ""
  }
});
