export function parseUrlAndPath(value) {
  const result = {}
  try {
    const url = new URL(value)
    result.url = url.origin
    result.path = url.pathname
  } catch (error) {
    const uriRegex = value.match(
      /^((http[s]?:\/\/)?(<<[^/]+>>)?[^/]*|)(\/?.*)$/
    )
    result.url = uriRegex[1]
    result.path = uriRegex[4]
  }
  return result
}
