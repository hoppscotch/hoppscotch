import * as O from "fp-ts/Option"

/**
 * Checks and Parses JSON string
 * @param str Raw JSON data to be parsed
 * @returns Option type with some(JSON data) or none
 */
export const safeParseJSON = (str: string): O.Option<object> =>
  O.tryCatch(() => JSON.parse(str))
