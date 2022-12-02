export function isDOMElement(el: any): el is HTMLElement {
  return !!el && (el instanceof Element || el instanceof HTMLElement)
}

export function isTypableElement(el: HTMLElement): boolean {
  // If content editable, then it is editable
  if (el.isContentEditable) return true

  // If element is an input and the input is enabled, then it is typable
  if (el.tagName === "INPUT") {
    return !(el as HTMLInputElement).disabled
  }
  // If element is a textarea and the input is enabled, then it is typable
  if (el.tagName === "TEXTAREA") {
    return !(el as HTMLTextAreaElement).disabled
  }

  return false
}
