import {
  blobPolyfill,
  ConsoleEntry,
  console as ConsoleModule,
  crypto,
  encoding,
  esmModuleLoader,
  timers,
  urlPolyfill,
} from "faraday-cage/modules"

type DefaultModulesConfig = {
  handleConsoleEntry: (consoleEntries: ConsoleEntry) => void
}

export const defaultModules = (config?: DefaultModulesConfig) => {
  return [
    urlPolyfill,
    blobPolyfill,
    ConsoleModule({
      onLog(level, ...args) {
        console[level](...args)

        config?.handleConsoleEntry({
          type: level,
          args,
          timestamp: Date.now(),
        })
      },
      onCount(...args) {
        console.count(args[0])
      },
      onTime(...args) {
        console.timeEnd(args[0])
      },
      onTimeLog(...args) {
        console.timeLog(...args)
      },
      onGroup(...args) {
        console.group(...args)
      },
      onGroupEnd(...args) {
        console.groupEnd(...args)
      },
      onClear(...args) {
        console.clear(...args)
      },
      onAssert(...args) {
        console.assert(...args)
      },
      onDir(...args) {
        console.dir(...args)
      },
      onTable(...args) {
        console.table(...args)
      },
    }),
    crypto({
      cryptoImpl: globalThis.crypto,
    }),

    esmModuleLoader,
    encoding(),
    timers(),
  ]
}
