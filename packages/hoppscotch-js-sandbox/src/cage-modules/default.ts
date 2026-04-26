import {
  blobPolyfill,
  ConsoleEntry,
  console as ConsoleModule,
  encoding,
  esmModuleLoader,
  timers,
  urlPolyfill,
} from "faraday-cage/modules"
import type { HoppFetchHook } from "~/types"
import { customCryptoModule } from "./crypto"
import { customFetchModule } from "./fetch"

type DefaultModulesConfig = {
  handleConsoleEntry?: (consoleEntries: ConsoleEntry) => void
  hoppFetchHook?: HoppFetchHook
}

export const defaultModules = (config?: DefaultModulesConfig) => {
  return [
    urlPolyfill,
    blobPolyfill,
    ConsoleModule({
      onLog(level, ...args) {
        console[level](...args)

        if (config?.handleConsoleEntry) {
          config.handleConsoleEntry({
            type: level,
            args,
            timestamp: Date.now(),
          })
        }
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
      onGroup(label, collapsed) {
        if (collapsed) {
          console.groupCollapsed(label)
        } else {
          console.group(label)
        }
        if (config?.handleConsoleEntry) {
          config.handleConsoleEntry({
            type: collapsed ? "groupCollapsed" : "group",
            args: label !== undefined ? [label] : [],
            timestamp: Date.now(),
          } as any)
        }
      },
      onGroupEnd() {
        console.groupEnd()
        if (config?.handleConsoleEntry) {
          config.handleConsoleEntry({
            type: "groupEnd",
            args: [],
            timestamp: Date.now(),
          } as any)
        }
      },
      onClear(...args) {
        console.clear(...args)
      },
      onAssert(...args) {
        console.assert(...args)
      },
      onDir(obj, options) {
        console.dir(obj, options)
        if (config?.handleConsoleEntry) {
          config.handleConsoleEntry({
            type: "dir",
            args: options !== undefined ? [obj, options] : [obj],
            timestamp: Date.now(),
          } as any)
        }
      },
      onTable(tabularData, properties) {
        console.table(tabularData, properties)
        if (config?.handleConsoleEntry) {
          config.handleConsoleEntry({
            type: "table",
            args:
              properties !== undefined ? [tabularData, properties] : [tabularData],
            timestamp: Date.now(),
          } as any)
        }
      },
    }),
    customCryptoModule({
      cryptoImpl: globalThis.crypto,
    }),

    esmModuleLoader,
    // Use custom fetch module with HoppFetchHook
    customFetchModule({
      fetchImpl: config?.hoppFetchHook,
    }),
    encoding(),
    timers(),
  ]
}
