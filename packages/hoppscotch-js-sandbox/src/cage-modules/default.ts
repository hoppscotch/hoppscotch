import {
  blobPolyfill,
  console as ConsoleModule,
  encoding,
  esmModuleLoader,
  timers,
  urlPolyfill,
} from "faraday-cage/modules"
import type { HoppFetchHook, SandboxConsoleEntry } from "~/types"
import { customCryptoModule } from "./crypto"
import { customFetchModule } from "./fetch"

type DefaultModulesConfig = {
  handleConsoleEntry?: (consoleEntry: SandboxConsoleEntry) => void
  hoppFetchHook?: HoppFetchHook
}

export const defaultModules = (config?: DefaultModulesConfig) => {
  const emitConsoleEntry = (
    entry: Omit<SandboxConsoleEntry, "timestamp">
  ) => {
    if (config?.handleConsoleEntry) {
      config.handleConsoleEntry({
        ...entry,
        timestamp: Date.now(),
      })
    }
  }

  return [
    urlPolyfill,
    blobPolyfill,
    ConsoleModule({
      onLog(level, ...args) {
        console[level](...args)

        emitConsoleEntry({
          type: level,
          args,
        })
      },
      onCount(label: string | undefined, count: number) {
        const displayLabel = label ?? "default"

        if (label === undefined) {
          console.count()
        } else {
          console.count(label)
        }

        emitConsoleEntry({
          type: "count",
          args: [displayLabel, count],
        })
      },
      onTime(label: string | undefined, duration: number) {
        const displayLabel = label ?? "default"

        if (label === undefined) {
          console.timeEnd()
        } else {
          console.timeEnd(label)
        }

        emitConsoleEntry({
          type: "timeEnd",
          args: [`${displayLabel}: ${duration}ms`],
        })
      },
      onTimeLog(
        label: string | undefined,
        duration: number,
        ...args: unknown[]
      ) {
        const displayLabel = label ?? "default"

        if (label === undefined) {
          console.timeLog()
        } else {
          console.timeLog(label, ...args)
        }

        emitConsoleEntry({
          type: "timeLog",
          args: [`${displayLabel}: ${duration}ms`, ...args],
        })
      },
      onGroup(label, collapsed) {
        if (collapsed) {
          if (label === undefined) {
            console.groupCollapsed()
          } else {
            console.groupCollapsed(label)
          }
        } else {
          if (label === undefined) {
            console.group()
          } else {
            console.group(label)
          }
        }

        emitConsoleEntry({
          type: "group",
          args: label === undefined ? [] : [label],
          collapsed,
        })
      },
      onGroupEnd() {
        console.groupEnd()
        emitConsoleEntry({
          type: "groupEnd",
          args: [],
        })
      },
      onClear() {
        console.clear()
        emitConsoleEntry({
          type: "clear",
          args: [],
        })
      },
      onAssert(condition, ...args) {
        console.assert(condition, ...args)

        if (!condition) {
          emitConsoleEntry({
            type: "assert",
            args: args.length > 0 ? args : ["Assertion failed"],
          })
        }
      },
      onDir(obj, options) {
        console.dir(obj, options)
        emitConsoleEntry({
          type: "dir",
          args: [obj],
        })
      },
      onTable(tabularData, properties) {
        console.table(tabularData, properties)
        emitConsoleEntry({
          type: "table",
          args: properties ? [tabularData, properties] : [tabularData],
        })
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
