import { KernelAPI } from "@hoppscotch/kernel"

export { Io } from "./io"
export { Relay } from "./relay"
export { Store } from "./store"

// Log and diag are intentionally not re-exported here. log.ts imports
// `getModule` from this file, and re-exporting from log.ts would create
// a circular dependency that causes a TDZ error at bundle time.
// consumers import directly from "~/kernel/log" instead

export const getModule = <K extends keyof KernelAPI>(
  name: K
): NonNullable<KernelAPI[K]> => {
  const kernel = window.__KERNEL__
  if (!kernel?.[name]) throw new Error(`Kernel ${name} not initialized`)
  return kernel[name]
}
