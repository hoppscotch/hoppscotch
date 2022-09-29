export const browserIsChrome = () =>
  /Chrome/i.test(navigator.userAgent) && /Google/i.test(navigator.vendor)

export const browserIsFirefox = () => /Firefox/i.test(navigator.userAgent)
