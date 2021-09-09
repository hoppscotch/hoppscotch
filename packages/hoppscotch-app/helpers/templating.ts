import { Environment } from "~/newstore/environments"

export default function parseTemplateString(
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
