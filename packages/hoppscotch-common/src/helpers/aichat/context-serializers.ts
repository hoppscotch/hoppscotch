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

const TRUNCATED = "…[truncated]"

/** Cuts at `max` without splitting an emoji into a lone surrogate. */
export const truncateText = (value: string, max: number) => {
  if (value.length <= max) return value
  const code = value.charCodeAt(max - 1)
  const cut = code >= 0xd800 && code <= 0xdbff ? max - 1 : max
  return `${value.slice(0, cut)}${TRUNCATED}`
}

const SCHEMA_SEP = "\n\n"
const MORE_TYPES = "…(schema truncated — more types exist)"

/**
 * Compact SDL snapshot of an introspected schema, at most `totalBudget`
 * characters. The operation roots (Query / Mutation / Subscription) go first
 * — they name every operation the endpoint offers — each cut to `rootBudget`,
 * and the remaining named types follow until the budget runs out, since real
 * schemas can be megabytes.
 */
export const serializeGQLSchema = (
  schema: GraphQLSchema,
  totalBudget = 6000,
  rootBudget = 2000
): string => {
  const parts: string[] = ["### GraphQL schema (introspected)"]
  // The note is held back up front, so adding it never breaks the budget.
  let used = parts[0].length + SCHEMA_SEP.length + MORE_TYPES.length
  const room = () => totalBudget - used - SCHEMA_SEP.length
  const add = (text: string) => {
    parts.push(text)
    used += SCHEMA_SEP.length + text.length
  }

  const roots = [
    schema.getQueryType(),
    schema.getMutationType(),
    schema.getSubscriptionType(),
  ].filter((t): t is NonNullable<typeof t> => !!t)
  const rootNames = new Set(roots.map((t) => t.name))

  let truncated = false
  for (const t of roots) {
    const printed = printType(t)
    const max = Math.min(rootBudget, room())
    if (printed.length <= max) add(printed)
    else if (max > TRUNCATED.length)
      add(truncateText(printed, max - TRUNCATED.length))
    else truncated = true
  }

  for (const t of Object.values(schema.getTypeMap())) {
    if (truncated) break
    if (rootNames.has(t.name)) continue
    if (isIntrospectionType(t) || isSpecifiedScalarType(t)) continue
    const printed = printType(t)
    if (printed.length > room()) truncated = true
    else add(printed)
  }
  if (truncated) parts.push(MORE_TYPES)

  return parts.join(SCHEMA_SEP)
}

/** Deepest folder level the outline walks; deeper ones are counted, not listed. */
const MAX_DEPTH = 3

const MORE_COLLECTIONS = "…(truncated — more collections/requests exist)"

/** Compact outline of a collection tree, at most `maxChars` characters. */
export const serializeCollections = (
  collections: HoppCollection[],
  maxLines = 80,
  maxChars = 7000
): string => {
  const lines: string[] = ["### Collections"]
  let count = 0
  // The note's line is held back up front, so adding it never breaks the cap.
  let used = lines[0].length + 1 + MORE_COLLECTIONS.length
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
      const folders = c.folders ?? []
      if (depth < MAX_DEPTH) {
        walk(folders, depth + 1)
      } else if (folders.length) {
        const n = folders.length
        push(
          `${"  ".repeat(depth + 1)}- …${n} more folder${n > 1 ? "s" : ""} nested deeper`
        )
      }
    }
  }

  walk(collections, 0)
  if (truncated) lines.push(MORE_COLLECTIONS)
  return lines.join("\n")
}
