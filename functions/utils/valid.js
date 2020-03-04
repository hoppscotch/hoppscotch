/**
 * valid url for ws/wss
 */
export function wsValid(url) {
  const protocol = "^(wss?:\\/\\/)?"
  const validIP = new RegExp(
    `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$`
  )
  const validHostname = new RegExp(
    `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$`
  )
  return validIP.test(url) || validHostname.test(url)
}

/**
 * valid url for http/https
 */
export function sseValid(url) {
  const protocol = "^(https?:\\/\\/)?"
  const validIP = new RegExp(
    `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$`
  )
  const validHostname = new RegExp(
    `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$`
  )
  return validIP.test(url) || validHostname.test(url)
}
