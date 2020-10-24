export default {
  setState({ request }, { attribute, value }) {
    request[attribute] = value
  },

  setWebSocketState({ ws }, { attribute, value }) {
    ws[attribute] = value
  },

  addWebSocketLog({ ws }, object) {
    ws.log.push(object)
  },

  setEventSourceState({ eventSource }, { attribute, value }) {
    eventSource[attribute] = value
  },

  addEventSourceLog({ eventSource }, object) {
    eventSource.log.push(object)
  },

  setSocketIOState({ socketIO }, { attribute, value }) {
    socketIO[attribute] = value
  },

  addSocketIOLog({ socketIO }, object) {
    socketIO.log.push(object)
  },

  addSocketIOInputs({ socketIO }, str) {
    socketIO.inputs.push(str)
  },

  removeFromSocketIOInputs({ socketIO }, index) {
    socketIO.inputs.splice(index, 1)
  },

  setSocketIOInput({ socketIO }, { index, value }) {
    socketIO.inputs[index] = value
  },

  setGQLState({ gql }, { attribute, value }) {
    gql[attribute] = value
  },

  setMQTTState({ mqtt }, { attribute, value }) {
    mqtt[attribute] = value
  },

  addMQTTLog({ mqtt }, object) {
    mqtt.log.push(object)
  },

  setCollapsedSection({ theme }, value) {
    theme.collapsedSections.includes(value)
      ? (theme.collapsedSections = theme.collapsedSections.filter((section) => section !== value))
      : theme.collapsedSections.push(value)
  },

  addGQLHeader({ gql }, object) {
    gql.headers.push(object)
  },

  removeGQLHeader({ gql }, index) {
    gql.headers.splice(index, 1)
  },

  setGQLHeaderKey({ gql }, { index, value }) {
    gql.headers[index].key = value
  },

  setGQLHeaderValue({ gql }, { index, value }) {
    gql.headers[index].value = value
  },

  addHeaders({ request }, value) {
    request.headers.push(value)
  },

  removeHeaders({ request }, index) {
    request.headers.splice(index, 1)
  },

  setKeyHeader({ request }, { index, value }) {
    request.headers[index].key = value
  },

  setValueHeader({ request }, { index, value }) {
    request.headers[index].value = value
  },

  addParams({ request }, value) {
    request.params.push(value)
  },

  removeParams({ request }, index) {
    request.params.splice(index, 1)
  },

  setKeyParams({ request }, { index, value }) {
    request.params[index].key = value
  },

  setValueParams({ request }, { index, value }) {
    request.params[index].value = encodeURI(value)
  },

  setTypeParams({ request }, { index, value }) {
    request.params[index].type = value
  },

  addBodyParams({ request }, value) {
    request.bodyParams.push(value)
  },

  removeBodyParams({ request }, index) {
    request.bodyParams.splice(index, 1)
  },

  setKeyBodyParams({ request }, { index, value }) {
    request.bodyParams[index].key = value
  },

  setValueBodyParams({ request }, { index, value }) {
    request.bodyParams[index].value = value
  },

  setOAuth2({ oauth2 }, { attribute, value }) {
    oauth2[attribute] = value
  },

  addOAuthToken({ oauth2 }, value) {
    oauth2.tokens.push(value)
  },

  removeOAuthToken({ oauth2 }, index) {
    oauth2.tokens.splice(index, 1)
  },

  setOAuthTokenName({ oauth2 }, { index, value }) {
    oauth2.tokens[index].name = value
  },

  addOAuthTokenReq({ oauth2 }, value) {
    oauth2.tokenReqs.push(value)
  },

  removeOAuthTokenReq({ oauth2 }, index) {
    oauth2.tokenReqs.splice(index, 1)
  },
}
