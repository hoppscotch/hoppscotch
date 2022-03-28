export function isAppleDevice() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
}

export function getPlatformSpecialKey() {
  return isAppleDevice() ? "⌘" : "Ctrl"
}

export function getPlatformAlternateKey() {
  return isAppleDevice() ? "⌥" : "Alt"
}
