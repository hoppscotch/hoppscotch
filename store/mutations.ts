import { RequestState, GQLState, KeyValuePair, OAuth2State } from "~/store/state";

export default {
  setState({ request }: { request: RequestState }, { attribute, value }: { attribute: string, value: any }) {
    request[attribute] = value;
  },

  setGQLState({ gql }: { gql: GQLState }, { attribute, value }: { attribute: string, value: any }) {
    gql[attribute] = value;
  },

  addGQLHeader({ gql }: { gql: GQLState }, obj: KeyValuePair<string, string>) {
    gql.headers.push(obj);
  },

  removeGQLHeader({ gql }: { gql: GQLState }, index: number) {
    gql.headers.splice(index, 1);
  },

  setGQLHeaderKey({ gql }: { gql: GQLState }, { index, value }: { index: number, value: string }) {
    gql.headers[index].key = value;
  },

  setGQLHeaderValue({ gql }: { gql: GQLState }, { index, value }: { index: number, value: string }) {
    gql.headers[index].value = value;
  },

  addGQLVariable({ gql }: { gql: GQLState }, obj: KeyValuePair<string, string>) {
    gql.variables.push(obj);
  },

  removeGQLVariable({ gql }: { gql: GQLState }, index: number) {
    gql.variables.splice(index, 1);
  },

  setGQLVariableKey({ gql }: { gql: GQLState }, { index, value }: { index: number, value: string }) {
    gql.variables[index].key = value;
  },

  setGQLVariableValue({ gql }: { gql: GQLState }, { index, value }: { index: number, value: string }) {
    gql.variables[index].value = value;
  },

  addHeaders({ request }: { request: RequestState }, value: KeyValuePair<string, string>) {
    request.headers.push(value);
  },

  removeHeaders({ request }: { request: RequestState }, index: number) {
    request.headers.splice(index, 1);
  },

  setKeyHeader({ request }: { request: RequestState }, { index, value }: { index: number, value: string }) {
    request.headers[index].key = value;
  },

  setValueHeader({ request }: { request: RequestState }, { index, value }: { index: number, value: string }) {
    request.headers[index].value = value;
  },

  addParams({ request }: { request: RequestState }, value: KeyValuePair<string, string>) {
    request.params.push(value);
  },

  removeParams({ request }: { request: RequestState }, index: number) {
    request.params.splice(index, 1);
  },

  setKeyParams({ request }: { request: RequestState }, { index, value }: { index: number, value: string }) {
    request.params[index].key = value;
  },

  setValueParams({ request }: { request: RequestState }, { index, value }: { index: number, value: string }) {
    request.params[index].value = value;
  },

  addBodyParams({ request }: { request: RequestState }, value: KeyValuePair<string, string>) {
    request.bodyParams.push(value);
  },

  removeBodyParams({ request }: { request: RequestState }, index: number) {
    request.bodyParams.splice(index, 1);
  },

  setKeyBodyParams({ request }: { request: RequestState }, { index, value }: { index: number, value: string }) {
    request.bodyParams[index].key = value;
  },

  setValueBodyParams({ request }: { request: RequestState }, { index, value }: { index: number, value: string }) {
    request.bodyParams[index].value = value;
  },

  setOAuth2({ oauth2 }: { oauth2: OAuth2State }, { attribute, value }: { attribute: string, value: any }) {
    oauth2[attribute] = value;
  },

  addOAuthToken({ oauth2 }: { oauth2: OAuth2State }, value: any) {
    oauth2.tokens.push(value);
  },

  removeOAuthToken({ oauth2 }: { oauth2: OAuth2State }, index: number) {
    oauth2.tokens.splice(index, 1);
  },

  setOAuthTokenName({ oauth2 }: { oauth2: OAuth2State }, { index, value }: { index: number, value: any }) {
    oauth2.tokens[index].name = value;
  },

  addOAuthTokenReq({ oauth2 }: { oauth2: OAuth2State }, value: any) {
    oauth2.tokenReqs.push(value);
  },

  removeOAuthTokenReq({ oauth2 }: { oauth2: OAuth2State }, index: number) {
    oauth2.tokenReqs.splice(index, 1);
  }
};
