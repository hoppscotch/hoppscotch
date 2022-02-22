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
    console.log(`${name}: `, x)
    return x
  }
