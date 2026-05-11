// Lightweight subpath export — string helpers only. Consumers reaching for
// `combineScriptsWithIIFE` / `hasActualScript` etc. can import from here
// without pulling in the runner modules' Vite-specific worker imports.
// Relative path so the emitted `.d.ts` stays portable (no `~/` alias leak).
export {
  MODULE_PREFIX,
  combineScriptsWithIIFE,
  filterValidScripts,
  hasActualScript,
  stripJsonSerializedModulePrefix,
  stripModulePrefix,
  type CombineScriptsTarget,
} from "./utils/scripting"
