import { HoppRESTRequestResponse } from "@hoppscotch/data"

import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

/**
 * Responses larger than this skip the in-memory prettify + outline-AST pipeline.
 * For large bodies that pipeline builds tens of MB of derived structures per
 * response (a lossless-parsed object graph, a re-stringified pretty copy and a
 * positional JSON AST) on top of the raw body, decoded string and editor
 * document — the dominant driver of the desktop app's memory growth on large
 * responses (issues #5883 / #6340). Above the threshold the body is shown as-is
 * (unformatted, no structure outline); the raw and download paths are unaffected.
 */
export const JSON_PRETTIFY_MAX_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Separate, lower threshold for the structure-outline AST. The positional JSON
 * AST powers only the outline breadcrumb yet is the single most expensive
 * derived structure — roughly 5x the body, ~45% of a response's in-memory
 * footprint. Building it for every formatted response is the largest avoidable
 * cost on small/medium responses too (not just multi-MB ones), so it is skipped
 * above this smaller threshold while formatting still applies up to
 * `JSON_PRETTIFY_MAX_BYTES`. Tunable; lower = less memory, fewer responses get
 * the outline. Keep this ≤ `JSON_PRETTIFY_MAX_BYTES` so the outline is always
 * dropped on the large responses that also skip formatting.
 */
export const JSON_OUTLINE_MAX_BYTES = 512 * 1024 // 512 KB

/**
 * Response body size in bytes, used to gate the prettify/outline caps above.
 *
 * Live REST responses usually carry an authoritative byte count in
 * `meta.responseSize`, but it is `0` for chunked-transfer responses that omit
 * `Content-Length` (the kernel reports no total size) — and saved collection
 * responses (`HoppRESTRequestResponse`) have no `meta` at all. In both cases we
 * fall back to the decoded string length; otherwise a large chunked response
 * would slip past the caps and run the full prettify/AST pipeline. `.length` is
 * ≈ bytes for the ASCII-dominant JSON this lens handles and avoids allocating a
 * sizing buffer the size of the body.
 */
export function responseBodySizeBytes(
  response: HoppRESTResponse | HoppRESTRequestResponse,
  bodyText: string
): number {
  const metaSize = "meta" in response ? (response.meta?.responseSize ?? 0) : 0
  return metaSize || bodyText.length
}
