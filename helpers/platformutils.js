export function getPlatformSpecialKey() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) ? "⌘" : "Ctrl"
}

export function getPlatformAlternateKey() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) ? "⌥" : "Alt"
}
