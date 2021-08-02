import Vue from "vue"

export default {
  setState({ request }, { attribute, value }) {
    request[attribute] = value
  },

  setGQLState({ gql }, { attribute, value }) {
    gql[attribute] = value
  },

  addGQLHeader({ gql }, object) {
    gql.headers.push(object)
  },

  setActiveGQLHeader({ gql }, { index, value }) {
    if (!Object.prototype.hasOwnProperty.call(gql.headers[index], "active")) {
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

  addParams({ request }, value) {
    request.params.push(value)
  },

  removeParams({ request }, index) {
    request.params.splice(index, 1)
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

  setBodyParams({ request }, { params }) {
    request.bodyParams = params
  },

  // While this mutation is same as the setValueBodyParams above, it is excluded
  // from vuex-persist. We will commit this mutation while adding a file
  // param as there is no way to serialize File objects and thus we cannot
  // persist file objects in localStorage
  setFilesBodyParams({ request }, { index, value }) {
    request.bodyParams[index].value = value
  },

  removeFile({ request }, { index, fileIndex }) {
    request.bodyParams[index].value.splice(fileIndex, 1)
  },

  setActiveBodyParams({ request }, { index, value }) {
    if (
      !Object.prototype.hasOwnProperty.call(request.bodyParams[index], "active")
    ) {
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
