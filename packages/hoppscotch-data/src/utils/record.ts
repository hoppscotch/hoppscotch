
/**
 * Modify a record value with a mapping function
 * @param name The key to update
 * @param func The value to update
 * @returns The updated record
 */
export const recordUpdate =
  <
    X extends {},
    K extends keyof X,
    R
  >(name: K, func: (input: X[K]) => R) =>
  (x: X): Omit<X, K> & { [x in K]: R } => ({
    ...x,
    [name]: func(x[name])
  })
