export default function parseTemplateString(str: string, variables: any) {
  if (!variables || !str) {
    return str;
  }
  const searchTerm = /<<([^>]*)>>/g; // "<<myVariable>>"
  return str.replace(searchTerm, (_match: string, p1: string) => variables[p1] || "");
}
