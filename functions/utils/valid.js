function generateIPRE(protocol) {
  return new RegExp(
    `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$`
  )
}
function generateHostnameRE(protocol) {
  return new RegExp(
    `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$`
  )
}

/**
 * valid url for ws/wss
 */
export function wsValid(url) {
  const protocol = "^(wss?:\\/\\/)?"
  const validIP = generateIPRE(protocol)
  const validHostname = generateHostnameRE(protocol)
  return validIP.test(url) || validHostname.test(url)
}

/**
 * valid url for http/https
 */
export function sseValid(url) {
  const protocol = "^(https?:\\/\\/)?"
  const validIP = generateIPRE(protocol)
  const validHostname = generateHostnameRE(protocol)
  return validIP.test(url) || validHostname.test(url)
}

/**
 * valid url for ws/wss/http/https
 */
export function socketioValid(url) {
  const protocol = "^((wss?:\\/\\/)|(https?:\\/\\/))?"
  const validIP = generateIPRE(protocol)
  const validHostname = generateHostnameRE(protocol)
  return validIP.test(url) || validHostname.test(url)
}
