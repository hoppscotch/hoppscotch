export function hasPathParams(params) {
  return params.filter(({ active }) => active == true).some(({ type }) => type === "path")
}

export function addPathParamsToVariables(params, variables) {
  params
    .filter(({ active }) => active == true)
    .filter(({ key }) => !!key)
    .filter(({ type }) => type === "path")
    .forEach(({ key, value }) => (variables[key] = value))
  return variables
}

export function getQueryParams(params) {
  return params
    .filter(({ active }) => active == true)
    .filter(({ key }) => !!key)
    .filter(({ type }) => type != "path")
}
