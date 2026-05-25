/**
 * Libraries cage module
 *
 * Pre-compiled IIFE bundles are injected into the QuickJS VM via evalCode().
 * Each bundle sets a named global on globalThis inside the VM:
 *
 *   Phase 1 — Utilities
 *   globalThis._            → lodash
 *   globalThis.lodash       → lodash (alias)
 *   globalThis.uuid         → uuid  (v4, v1, v5, …)
 *
 *   Phase 2 — Date & Parsing
 *   globalThis.moment       → moment
 *   globalThis.xml2js       → xml2js
 *   globalThis.cheerio      → cheerio
 *
 *   Phase 3 — Crypto
 *   globalThis.CryptoJS     → crypto-js
 *   globalThis.forge        → node-forge
 *
 *   Phase 4 — Validation
 *   globalThis.tv4          → tv4
 *   globalThis.Ajv          → ajv (JSON Schema v8)
 *   globalThis.ajv          → ajv (lowercase alias)
 *   globalThis.ajvFormats   → ajv-formats (addFormats plugin)
 *
 *   Phase 5 — Full Parity
 *   globalThis.chai         → chai (BDD/TDD assertions)
 *   globalThis.expect       → chai.expect (convenience)
 *   globalThis.assert       → chai.assert (convenience)
 *   globalThis.JSONPath     → jsonpath-plus query engine
 *   globalThis.jsonpathPlus → jsonpath-plus full module
 *   globalThis.FormDataNode → form-data (Node.js npm package)
 *
 * These globals are then accessible:
 *   1. Directly in user scripts  (e.g.  _.chunk([1,2,3,4], 2))
 *   2. Via pm.require()          (e.g.  const _ = pm.require('lodash'))
 */

import { defineCageModule } from "faraday-cage/modules"

// ?raw imports: Vite (and the Rollup-built dist) will inline each file as a
// plain JS string so we can pass it directly to ctx.vm.evalCode().

// Phase 1
import lodashBundle from "../lib-bundles/lodash.iife.js?raw"
import uuidBundle from "../lib-bundles/uuid.iife.js?raw"
// Phase 2
import momentBundle from "../lib-bundles/moment.iife.js?raw"
import xml2jsBundle from "../lib-bundles/xml2js.iife.js?raw"
import cheerioBundle from "../lib-bundles/cheerio.iife.js?raw"
// Phase 3
import cryptoJsBundle from "../lib-bundles/crypto-js.iife.js?raw"
import nodeForgeBundle from "../lib-bundles/node-forge.iife.js?raw"
// Phase 4
import tv4Bundle from "../lib-bundles/tv4.iife.js?raw"
import ajvBundle from "../lib-bundles/ajv.iife.js?raw"
import ajvFormatsBundle from "../lib-bundles/ajv-formats.iife.js?raw"
// Phase 5
import chaiBundle from "../lib-bundles/chai.iife.js?raw"
import jsonpathPlusBundle from "../lib-bundles/jsonpath-plus.iife.js?raw"
import formDataBundle from "../lib-bundles/form-data.iife.js?raw"

/** All bundled library strings in injection order */
const LIBRARY_BUNDLES: Array<{ name: string; code: string }> = [
  // Phase 1
  { name: "lodash", code: lodashBundle },
  { name: "uuid", code: uuidBundle },
  // Phase 2
  { name: "moment", code: momentBundle },
  { name: "xml2js", code: xml2jsBundle },
  { name: "cheerio", code: cheerioBundle },
  // Phase 3
  { name: "crypto-js", code: cryptoJsBundle },
  { name: "node-forge", code: nodeForgeBundle },
  // Phase 4 — ajv-formats must come AFTER ajv so Ajv is already on globalThis
  { name: "tv4", code: tv4Bundle },
  { name: "ajv", code: ajvBundle },
  { name: "ajv-formats", code: ajvFormatsBundle },
  // Phase 5
  { name: "chai", code: chaiBundle },
  { name: "jsonpath-plus", code: jsonpathPlusBundle },
  { name: "form-data", code: formDataBundle },
]

/**
 * Cage module that injects all third-party library IIFE bundles into the
 * QuickJS VM context before the user script runs.
 */
export const librariesModule = () =>
  defineCageModule((ctx) => {
    for (const { name, code } of LIBRARY_BUNDLES) {
      try {
        const result = ctx.vm.evalCode(code)
        if ("error" in result) {
          // Dispose the error handle and warn — don't crash the whole sandbox
          const errHandle = result.error
          if (errHandle) {
            try {
              const errDump = ctx.vm.dump(errHandle)
              console.warn(`[js-sandbox] Failed to inject library bundle: ${name} —`, errDump)
            } catch (_e) {
              console.warn(`[js-sandbox] Failed to inject library bundle: ${name}`)
            }
            errHandle.dispose()
          }
        } else {
          result.value?.dispose()
        }
      } catch (err) {
        console.warn(`[js-sandbox] Exception injecting library bundle: ${name}`, err)
      }
    }
  })



