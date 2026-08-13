interface RequestParam {
  key: string
  value: string
  type: string
  active?: boolean
}

function isActiveParam(item: RequestParam): boolean {
  return Object.prototype.hasOwnProperty.call(item, "active")
    ? item.active === true
    : true
}

export function hasPathParams(params: RequestParam[]): boolean {
  return params.filter(isActiveParam).some(({ type }) => type === "path")
}

export function addPathParamsToVariables(
  params: RequestParam[],
  variables: Record<string, string>
): Record<string, string> {
  params
    .filter(isActiveParam)
    .filter(({ key }) => !!key)
    .filter(({ type }) => type === "path")
    .forEach(({ key, value }) => (variables[key] = value))
  return variables
}

export function getQueryParams(params: RequestParam[]): RequestParam[] {
  return params
    .filter(isActiveParam)
    .filter(({ key }) => !!key)
    .filter(({ type }) => type !== "path")
}
