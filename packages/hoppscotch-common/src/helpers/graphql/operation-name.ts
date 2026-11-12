import type { OperationDefinitionNode } from "graphql"

/** Operation names share a namespace across queries, mutations and subscriptions. */
export function getUniqueOperationName(
  baseName: string,
  operations: readonly OperationDefinitionNode[]
): string {
  const names = new Set(operations.map((operation) => operation.name?.value))
  let name = baseName
  let suffix = 1
  while (names.has(name)) {
    name = `${baseName}_${suffix++}`
  }
  return name
}
