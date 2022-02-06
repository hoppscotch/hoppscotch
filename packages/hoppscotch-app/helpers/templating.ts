import { Environment } from "~/newstore/environments"

export function parseBodyEnvVariables(
  body: string,
  env: Environment["variables"]
) {
  return innerParse(body, env)
}

const searchTerm = /<<(\w+)>>/g // "<<myVariable>>"
export function parseTemplateString(
  str: string,
  variables: Environment["variables"]
) {
  if (!variables || !str) {
    return str
  }

  return innerParse(decodeURI(encodeURI(str)), variables)
}

function innerParse(str: string, variables: Environment["variables"]): string {
  const result = str.replace(
    searchTerm,
    (_, p1) => variables.find((x) => x.key === p1)?.value || ""
  )
  if (result === str) {
    return result
  }

  return innerParse(result, variables)
}
