import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"

/**
 * Logs the current value and returns the same value
 * @param x The value to log
 * @returns The parameter `x` passed to this
 */
export const trace = <T>(x: T) => {
  console.log(x)
  return x
}

/**
 * Logs the annotated current value and returns the same value
 * @param name The name of the log
 * @curried_param `x` The value to log
 * @returns The parameter `x` passed to this
 */
export const namedTrace =
  (name: string) =>
  <T>(x: T) => {
    const printFn = (val?: T | string) => console.log(`${name}: ${val ?? x}`)
    pipe(
      O.tryCatch(() => JSON.stringify(x)),
      O.match(printFn, printFn)
    )
    return x
  }
