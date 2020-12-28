export function hasPathParams(params) {
  return params
    .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
    .some(({ type }) => type === "path")
}

export function addPathParamsToVariables(params, variables) {
  params
    .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
    .filter(({ key }) => !!key)
    .filter(({ type }) => type === "path")
    .forEach(({ key, value }) => (variables[key] = value))
  return variables
}

export function getQueryParams(params) {
  return params
    .filter((item) => (item.hasOwnProperty("active") ? item.active == true : true))
    .filter(({ key }) => !!key)
    .filter(({ type }) => type != "path")
}
