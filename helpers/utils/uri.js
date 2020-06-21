export function parseUrlAndPath(value) {
  let result = {}
  try {
    let url = new URL(value)
    result.url = url.origin
    result.path = url.pathname
  } catch (error) {
    let uriRegex = value.match(/^((http[s]?:\/\/)?(<<[^\/]+>>)?[^\/]*|)(\/?.*)$/)
    result.url = uriRegex[1]
    result.path = uriRegex[4]
  }
  return result
}
