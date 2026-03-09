import { HoppRESTRequest } from "@hoppscotch/data"

/**
 * Applies pre-request script modifications to the original request.
 *
 * For legacy sandbox: Returns original request unchanged (`updatedRequest` is `undefined`).
 * For experimental sandbox: Merges script changes while preserving file uploads
 * lost during JSON serialization.
 *
 * Context: When the experimental scripting sandbox is enabled, requests are
 * sent to a Web Worker for pre-request script execution. The request undergoes
 * JSON serialization which converts File/Blob objects to empty objects `{}`.
 * A Zod transform then converts file fields with empty arrays to text fields
 * (`isFile: false`, `value: ""`).
 *
 * This function uses hybrid matching to handle both:
 * - Duplicate keys (e.g., multiple fields with `key="file"`) via index matching
 * - Field reordering by scripts via key-based fallback
 *
 * @param originalRequest The original request with file uploads intact
 * @param updatedRequest The request returned from sandbox (undefined for legacy, modified for experimental)
 * @returns Merged request with file uploads preserved and script changes applied
 *
 * @see https://github.com/hoppscotch/hoppscotch/issues/5443
 * @see FormDataKeyValue schema in ~/hoppscotch-data/src/rest/v/9/body.ts
 */
export const applyScriptRequestUpdates = (
  originalRequest: HoppRESTRequest,
  updatedRequest?: HoppRESTRequest
): HoppRESTRequest => {
  if (!updatedRequest) {
    return originalRequest
  }

  const originalBody = originalRequest.body
  const updatedBody = updatedRequest.body

  if (
    originalBody.contentType === "multipart/form-data" &&
    updatedBody.contentType === "multipart/form-data"
  ) {
    const originalFormData = originalBody.body
    const updatedFormData = updatedBody.body
    const usedIndices = new Set<number>()

    const mergedFormData = updatedFormData.map((updatedField, index) => {
      // Hybrid matching: try position first (handles duplicate keys like "file", "file", "file"),
      // then search by key (handles field reordering by scripts)
      const samePositionMatch =
        index < originalFormData.length &&
        !usedIndices.has(index) &&
        originalFormData[index].key === updatedField.key

      const matchedIndex = samePositionMatch
        ? index
        : originalFormData.findIndex(
            (field, i) => !usedIndices.has(i) && field.key === updatedField.key
          )

      // If matched, restore file data from original (only `originalField` has `isFile=true`)
      if (matchedIndex >= 0) {
        usedIndices.add(matchedIndex)
        const originalField = originalFormData[matchedIndex]

        if (originalField.isFile) {
          return {
            ...updatedField,
            value: originalField.value,
            isFile: true as const,
            ...(originalField.contentType && {
              contentType: originalField.contentType,
            }),
          } as typeof updatedField
        }
      }

      return updatedField
    })

    return {
      ...originalRequest,
      ...updatedRequest,
      body: { ...updatedBody, body: mergedFormData },
    }
  }

  if (
    originalBody.contentType === "application/octet-stream" &&
    updatedBody.contentType === "application/octet-stream" &&
    originalBody.body instanceof Blob
  ) {
    return {
      ...originalRequest,
      ...updatedRequest,
      body: { ...updatedBody, body: originalBody.body },
    }
  }

  // No files to preserve
  return {
    ...originalRequest,
    ...updatedRequest,
  }
}
