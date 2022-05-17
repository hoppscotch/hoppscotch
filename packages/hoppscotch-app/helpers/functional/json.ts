import * as O from "fp-ts/Option"

/**
 * Checks and Parses JSON string
 * @param str Raw JSON data to be parsed
 * @returns Option type with some(JSON data) or none
 */
export const safeParseJSON = (str: string): O.Option<object> =>
  O.tryCatch(() => JSON.parse(str))

/**
 * Generates a prettified JSON representation of an object
 * @param obj The object to get the representation of
 * @returns The prettified JSON string of the object
 */
export const prettyPrintJSON = (obj: unknown): O.Option<string> =>
  O.tryCatch(() => JSON.stringify(obj, null, "\t"))
