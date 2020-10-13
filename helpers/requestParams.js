export function hasPathParams(params) {
  return params.some(({ type }) => type === "path")
}

export function addPathParamsToVariables(params, variables) {
  params
    .filter(({ key }) => !!key)
    .filter(({ type }) => type === "path")
    .forEach(({ key, value }) => (variables[key] = value))
  return variables
}

export function getQueryParams(params) {
  return params.filter(({ key }) => !!key).filter(({ type }) => type != "path")
}
