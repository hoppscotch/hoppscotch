/**
 * Copies a given string to the clipboard using
 * the modern clipboard API or legacy exec method
 *
 * @param content The content to be copied
 * @returns A boolean indicating if the copy was successful
 */
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(content)
      return true
    }
    const dummy = document.createElement("textarea")
    document.body.appendChild(dummy)
    dummy.value = content
    dummy.select()
    const success = document.execCommand("copy")
    document.body.removeChild(dummy)
    return success
  } catch (e) {
    console.error("Clipboard copy failed:", e)
    return false
  }
}
