import Vue from "vue"

export default {
  setState({ request }, { attribute, value }) {
    request[attribute] = value
  },

  setGQLState({ gql }, { attribute, value }) {
    gql[attribute] = value
  },

  setCollapsedSection({ theme }, value) {
    theme.collapsedSections.includes(value)
      ? (theme.collapsedSections = theme.collapsedSections.filter((section) => section !== value))
      : theme.collapsedSections.push(value)
  },

  addGQLHeader({ gql }, object) {
    gql.headers.push(object)
  },

  setActiveGQLHeader({ gql }, { index, value }) {
    if (!gql.headers[index].hasOwnProperty("active")) {
      Vue.set(gql.headers[index], "active", value)
    } else {
      gql.headers[index].active = value
    }
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

  setActiveHeader({ request }, { index, value }) {
    if (!request.headers[index].hasOwnProperty("active")) {
      Vue.set(request.headers[index], "active", value)
    } else {
      request.headers[index].active = value
    }
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
    request.params[index].value = value
  },

  setTypeParams({ request }, { index, value }) {
    request.params[index].type = value
  },

  setActiveParams({ request }, { index, value }) {
    if (!request.params[index].hasOwnProperty("active")) {
      Vue.set(request.params[index], "active", value)
    } else {
      request.params[index].active = value
    }
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

  setActiveBodyParams({ request }, { index, value }) {
    if (!request.bodyParams[index].hasOwnProperty("active")) {
      Vue.set(request.bodyParams[index], "active", value)
    } else {
      request.bodyParams[index].active = value
    }
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
