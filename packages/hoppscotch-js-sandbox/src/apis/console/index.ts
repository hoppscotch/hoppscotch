import cloneDeep from "lodash/cloneDeep"
import {
  defineAPI,
  onPreRequestScriptComplete,
  onTestScriptComplete,
} from "../../api"
import {
  defineVmFn,
  disposeHandlers,
  getFunctionLineNumber,
  setFnHandlers,
  updateScript,
  VmFnPairs,
} from "../../utils"

type ConsoleType = "log" | "error" | "warn" | "debug"

type ConsoleKeys = ConsoleType

export type HoppConsole = {
  lineNumber: number
  data: Array<any>
  type: ConsoleType
}

export default (script: string) =>
  defineAPI("console", (vm) => {
    const handle = vm.newObject()
    let scriptSource = cloneDeep(script)
    const consolesData: HoppConsole[] = []

    const consoleTemplateFn = (type: ConsoleType) =>
      defineVmFn((...args) => {
        const data = args.map(vm.dump)
        const target = `pw.console.${type}`
        const lineNumber = getFunctionLineNumber(target, scriptSource)
        scriptSource = updateScript(lineNumber, scriptSource)

        const consoleData: HoppConsole = {
          lineNumber,
          data,
          type,
        }

        consolesData.push(consoleData)

        return {
          value: vm.undefined,
        }
      })

    const logHandleFn = consoleTemplateFn("log")
    const warnHandleFn = consoleTemplateFn("warn")
    const errorHandleFn = consoleTemplateFn("error")
    const debugHandleFn = consoleTemplateFn("debug")

    const vmFnPairs: VmFnPairs<ConsoleKeys>[] = [
      { key: "log", func: logHandleFn },
      { key: "warn", func: warnHandleFn },
      { key: "error", func: errorHandleFn },
      { key: "debug", func: debugHandleFn },
    ]

    const handlers = setFnHandlers(vm, handle, vmFnPairs)
    disposeHandlers(handlers)

    onPreRequestScriptComplete((report) => ({
      ...report,
      consoles: [...report.consoles, ...consolesData],
    }))

    onTestScriptComplete((report) => ({
      ...report,
      consoles: [...report.consoles, ...consolesData],
    }))

    return {
      rootHandle: handle,
      exposes: {},
      childAPIs: [],
    }
  })
