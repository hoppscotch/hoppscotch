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

export interface GQLState {
  url: string;
  headers: KeyValuePair<string, string>[];
  variables: KeyValuePair<string, string>[];
  query: string;

  [key: string]: any;
}

interface EditorState {
  request: RequestState,
  gql: GQLState
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
  }
});
