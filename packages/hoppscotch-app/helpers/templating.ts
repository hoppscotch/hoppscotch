import { Environment } from "~/newstore/environments"

export function parseBodyEnvVariables(
  body: string,
  env: Environment["variables"]
) {
  return body.replace(/<<\w+>>/g, (key) => {
    const found = env.find((envVar) => envVar.key === key.replace(/[<>]/g, ""))
    return found ? found.value : key
  })
}

export function parseTemplateString(
  str: string,
  variables: Environment["variables"]
) {
  if (!variables || !str) {
    return str
  }
  const searchTerm = /<<([^>]*)>>/g // "<<myVariable>>"
  return decodeURI(encodeURI(str)).replace(
    searchTerm,
    (_, p1) => variables.find((x) => x.key === p1)?.value || ""
  )
}
