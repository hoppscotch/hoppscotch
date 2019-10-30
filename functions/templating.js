export default function parseTemplateString(string, variables) {
    const searchTerm = /\${([^}]*)}/g; // "${myVariable}"
    return string.replace(searchTerm, (match, p1) => variables[p1] || '');
}
