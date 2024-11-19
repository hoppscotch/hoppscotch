/**
 * Generate a unique reference ID
 * @param prefix Prefix to add to the generated ID
 * @returns The generated reference ID
 */
export const generateUniqueRefId = (prefix = "") => {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomUUID().replace(/-/g, "").substr(0, 12)
  const cryptoPart = window.crypto
    .getRandomValues(new Uint32Array(1))[0]
    .toString(36)

  return `${prefix}_${timestamp}_${randomPart}_${cryptoPart}`
}
