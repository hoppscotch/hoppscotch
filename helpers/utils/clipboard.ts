/**
 * Copies a given string to the clipboard using
 * the legacy exec method
 *
 * @param content The content to be copied
 */
export function copyToClipboard(content: string) {
  const dummy = document.createElement("textarea")
  document.body.appendChild(dummy)
  dummy.value = content
  dummy.select()
  document.execCommand("copy")
  document.body.removeChild(dummy)
}
