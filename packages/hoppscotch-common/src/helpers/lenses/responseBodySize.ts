/**
 * Bodies larger than this skip JSON formatted preview (parse, pretty-print,
 * outline, CodeMirror highlighting).
 *
 * This is not `BODY_CAP_BYTES` (300_000) from runner-result export. That cap
 * is for persisting collection-runner reports, not on-screen rendering, and
 * using it here would disable formatting for ordinary API responses.
 *
 * 5 MiB keeps typical JSON responses formatted. Isolated parse + pretty-print
 * of 5 MB is ~100ms; 20 MB is already hundreds of ms before CodeMirror and
 * the JSON AST, and 120 MB is multiple seconds plus several extra in-memory
 * copies of the body.
 */
export const JSON_FORMATTED_PREVIEW_LIMIT_BYTES = 5 * 1024 * 1024

export function getResponseBodyByteLength(body: string | ArrayBuffer): number {
  if (typeof body === "string") {
    // body.length (UTF-16 units) is a lower bound on UTF-8 byte count;
    // skip encode() for strings already over the threshold. Do not use this
    // return value for display sizes.
    if (body.length > JSON_FORMATTED_PREVIEW_LIMIT_BYTES) {
      return body.length
    }
    return new TextEncoder().encode(body).byteLength
  }

  return body.byteLength
}

export function isBodyTooLargeForJsonPreview(
  body: string | ArrayBuffer | null | undefined
): boolean {
  if (body === null || body === undefined || body === "") {
    return false
  }

  return getResponseBodyByteLength(body) > JSON_FORMATTED_PREVIEW_LIMIT_BYTES
}
