const wsRegex = generateREForProtocol("^(wss?:\\/\\/)?")
const sseRegex = generateREForProtocol("^(https?:\\/\\/)?")
const socketioRegex = generateREForProtocol("^((wss?:\\/\\/)|(https?:\\/\\/))?")

function generateREForProtocol(protocol) {
  return new RegExp(
    `${protocol}[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/\\/=]*)`
  )
}

/**
 * valid url for ws/wss
 */
export function wsValid(url) {
  return wsRegex.test(url)
}

/**
 * valid url for http/https
 */
export function sseValid(url) {
  return sseRegex.test(url)
}

/**
 * valid url for ws/wss/http/https
 */
export function socketioValid(url) {
  return socketioRegex.test(url)
}
