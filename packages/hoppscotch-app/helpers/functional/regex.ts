/**
 * Escapes special regex characters in a string.
 * @param text The string to transform
 * @returns Escaped string
 */
export const regexEscape = (text: string) =>
  text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")

export type RegexMatch = {
  matchString: string
  startIndex: number
  endIndex: number
}

/**
 * Returns all the regex match ranges for a given input
 * @param regex The Regular Expression to find from
 * @param input The input string to get match ranges from
 * @returns An array of `RegexMatch` objects giving info about the matches
 */
export const regexFindAllMatches = (regex: RegExp) => (input: string) => {
  const matches: RegexMatch[] = []

  // eslint-disable-next-line no-cond-assign, prettier/prettier
  for (let match; match = regex.exec(input); match !== null)
    matches.push({
      matchString: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length - 1,
    })

  return matches
}
