function generateREForProtocol(protocol) {
  return new RegExp(
    `${protocol}[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/\\/=]*)`
  )
}

/**
 * valid url for ws/wss
 */
export function wsValid(url) {
  const protocol = "^(wss?:\\/\\/)?"
  return generateREForProtocol(protocol).test(url)
}

/**
 * valid url for http/https
 */
export function sseValid(url) {
  const protocol = "^(https?:\\/\\/)?"
  return generateREForProtocol(protocol).test(url)
}

/**
 * valid url for ws/wss/http/https
 */
export function socketioValid(url) {
  const protocol = "^((wss?:\\/\\/)|(https?:\\/\\/))?"
  return generateREForProtocol(protocol).test(url)
}
