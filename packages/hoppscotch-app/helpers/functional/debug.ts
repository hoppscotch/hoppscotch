/**
 * Logs the current value and returns the same value
 * @param x The value to log
 * @returns The parameter `x` passed to this
 */
export const trace = <T>(x: T) => {
  console.log(x)
  return x
}
