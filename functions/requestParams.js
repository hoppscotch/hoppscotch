export function hasPathParams(params) {
    return params.some((p) => p.type === "path")
}
  
export function addPathParamsToVariables(params, variables) {
    params
        .filter(({ key }) => !!key)
        .filter(({ type }) => type === "path")
        .forEach(p => variables[p.key] = p.value)
    return variables;
}

export function getQueryParams(params) {
    return params
        .filter(({ key }) => !!key)
        .filter(({ type }) => type != "path")
}