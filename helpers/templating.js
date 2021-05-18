export default function parseTemplateString(string, variables) {
  if (!variables || !string) {
    return string
  }
  const searchTerm = /<<([^>]*)>>/g // "<<myVariable>>"
  return decodeURI(encodeURI(string)).replace(
    searchTerm,
    (_, p1) => variables[p1] || ""
  )
}
