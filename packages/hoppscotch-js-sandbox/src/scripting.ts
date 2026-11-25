// Subpath barrel for string helpers; lets consumers skip the runner-module
// Vite worker imports. Relative path keeps the emitted `.d.ts` portable.
export {
  MODULE_PREFIX,
  combineScriptsWithIIFE,
  filterValidScripts,
  hasActualScript,
  stripJsonSerializedModulePrefix,
  stripModulePrefix,
  type CombineScriptsTarget,
} from "./utils/scripting"
