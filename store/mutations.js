export default {
  setState(state, object) {
    state.request[object.attribute] = object.value
  },

  addHeaders(state, value) {
    state.request.headers.push(value);
  },

  removeHeaders(state, index) {
    state.request.headers.splice(index, 1)
  },

  setKeyHeader(state, object) {
    state.request.headers[object.index].key = object.value
  },

  setValueHeader(state, object) {
    state.request.headers[object.index].value = object.value
  },

  addParams(state, value) {
    state.request.params.push(value);
  },

  removeParams(state, index) {
    state.request.params.splice(index, 1)
  },

  setKeyParams(state, object) {
    state.request.params[object.index].key = object.value
  },

  setValueParams(state, object) {
    state.request.params[object.index].value = object.value
  },

  addBodyParams(state, value) {
    state.request.bodyParams.push(value);
  },

  removeBodyParams(state, index) {
    state.request.bodyParams.splice(index, 1)
  },

  setKeyBodyParams(state, object) {
    state.request.bodyParams[object.index].key = object.value
  },

  setValueBodyParams(state, object) {
    state.request.bodyParams[object.index].value = object.value
  },
};
