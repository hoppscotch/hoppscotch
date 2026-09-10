import type { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import {
  GraphQLSchema,
  isIntrospectionType,
  isSpecifiedScalarType,
  printType,
} from "graphql"

/**
 * Serializers for context the assistant fetches ON DEMAND (via the
 * get_graphql_schema / list_collections tools) rather than receiving on every
 * call — they are the largest pieces of context and rarely needed.
 */

export const truncateText = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}…[truncated]` : value

/**
 * Compact SDL snapshot of an introspected schema. The operation roots
 * (Query / Mutation / Subscription) always ship — they name every operation
 * the endpoint offers — and the remaining named types follow until the
 * budget runs out, since real schemas can be megabytes.
 */
export const serializeGQLSchema = (
  schema: GraphQLSchema,
  totalBudget = 6000,
  rootBudget = 2000
): string => {
  const parts: string[] = ["### GraphQL schema (introspected)"]
  let used = parts[0].length

  const roots = [
    schema.getQueryType(),
    schema.getMutationType(),
    schema.getSubscriptionType(),
  ].filter((t): t is NonNullable<typeof t> => !!t)
  const rootNames = new Set(roots.map((t) => t.name))

  for (const t of roots) {
    const printed = truncateText(printType(t), rootBudget)
    parts.push(printed)
    used += printed.length
  }

  let truncated = false
  for (const t of Object.values(schema.getTypeMap())) {
    if (rootNames.has(t.name)) continue
    if (isIntrospectionType(t) || isSpecifiedScalarType(t)) continue
    const printed = printType(t)
    if (used + printed.length > totalBudget) {
      truncated = true
      break
    }
    parts.push(printed)
    used += printed.length
  }
  if (truncated) parts.push("…(schema truncated — more types exist)")

  return parts.join("\n\n")
}

/** Compact outline of a collection tree — capped so the result stays bounded. */
export const serializeCollections = (
  collections: HoppCollection[],
  maxLines = 80,
  maxChars = 7000
): string => {
  const lines: string[] = ["### Collections"]
  let count = 0
  let used = lines[0].length
  let truncated = false

  const push = (line: string): boolean => {
    if (count >= maxLines || used + line.length + 1 > maxChars) {
      truncated = true
      return false
    }
    lines.push(line)
    count += 1
    used += line.length + 1
    return true
  }

  const walk = (nodes: HoppCollection[], depth: number) => {
    for (const c of nodes) {
      if (truncated) return
      if (!push(`${"  ".repeat(depth)}- ${c.name || "Untitled"}/`)) return
      for (const req of c.requests ?? []) {
        const r = req as HoppRESTRequest
        const kind = "method" in r && r.method ? r.method : "GQL"
        if (
          !push(
            `${"  ".repeat(depth + 1)}- ${kind} ${
              r.name || r.endpoint || "request"
            }`
          )
        ) {
          return
        }
      }
      if (depth < 3) walk(c.folders ?? [], depth + 1)
    }
  }

  walk(collections, 0)
  if (truncated) lines.push("…(truncated — more collections/requests exist)")
  return lines.join("\n")
}
