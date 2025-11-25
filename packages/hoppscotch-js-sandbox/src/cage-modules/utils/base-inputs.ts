import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { CageModuleCtx, defineSandboxFn } from "faraday-cage/modules"

import { TestResult, BaseInputs, SandboxValue } from "~/types"
import {
  getSharedCookieMethods,
  getSharedEnvMethods,
  getSharedRequestProps,
} from "~/utils/shared"
import { UNDEFINED_MARKER, NULL_MARKER } from "~/constants/sandbox-markers"
import { createHoppNamespaceMethods } from "../namespaces/hopp-namespace"
import { createPmNamespaceMethods } from "../namespaces/pm-namespace"
import { createPwNamespaceMethods } from "../namespaces/pw-namespace"

type BaseInputsConfig = {
  /**
   * Environment variables typed as TestResult["envs"] for external API compatibility.
   * At runtime, this will be mutated to contain SandboxValue types (arrays, objects, etc.)
   * during script execution to support PM namespace compatibility.
   * See `getSharedEnvMethods()` for detailed explanation of the type flow.
   */
  envs: TestResult["envs"]
  request: HoppRESTRequest
  cookies: Cookie[] | null
  getUpdatedRequest?: () => HoppRESTRequest
}

/**
 * Creates the base input object containing all shared methods across namespaces
 */
export const createBaseInputs = (
  ctx: CageModuleCtx,
  config: BaseInputsConfig
): BaseInputs => {
  // Get environment methods - Applicable to both hopp and pw namespaces
  const {
    methods: envMethods,
    pmSetAny,
    updatedEnvs,
  } = getSharedEnvMethods(config.envs, true)

  const { methods: cookieMethods, getUpdatedCookies } = getSharedCookieMethods(
    config.cookies
  )

  // Get request properties - shared across pre and post request contexts
  // For pre-request, use the updater function to read from mutated request
  const requestProps = getSharedRequestProps(
    config.request,
    config.getUpdatedRequest
  )

  // Cookie accessors
  const cookieProps = {
    cookieGet: defineSandboxFn(
      ctx,
      "cookieGet",
      (domain: SandboxValue, name: SandboxValue) => {
        return cookieMethods.get(domain, name) || null
      }
    ),
    cookieSet: defineSandboxFn(
      ctx,
      "cookieSet",
      (domain: SandboxValue, cookie: SandboxValue) => {
        return cookieMethods.set(domain, cookie)
      }
    ),
    cookieHas: defineSandboxFn(
      ctx,
      "cookieHas",
      (domain: SandboxValue, name: SandboxValue) => {
        return cookieMethods.has(domain, name)
      }
    ),
    cookieGetAll: defineSandboxFn(
      ctx,
      "cookieGetAll",
      (domain: SandboxValue) => {
        return cookieMethods.getAll(domain)
      }
    ),
    cookieDelete: defineSandboxFn(
      ctx,
      "cookieDelete",
      (domain: SandboxValue, name: SandboxValue) => {
        return cookieMethods.delete(domain, name)
      }
    ),
    cookieClear: defineSandboxFn(ctx, "cookieClear", (domain: SandboxValue) => {
      return cookieMethods.clear(domain)
    }),
  }

  // Environment accessors for toObject() support
  const envAccessors = {
    getAllSelectedEnvs: defineSandboxFn(ctx, "getAllSelectedEnvs", () => {
      return updatedEnvs.selected || []
    }),
    getAllGlobalEnvs: defineSandboxFn(ctx, "getAllGlobalEnvs", () => {
      return updatedEnvs.global || []
    }),
  }

  // Combine all namespace methods
  const pwMethods = createPwNamespaceMethods(ctx, envMethods, requestProps)
  const hoppMethods = createHoppNamespaceMethods(ctx, envMethods, requestProps)
  const pmMethods = createPmNamespaceMethods(ctx, config)

  // PM namespace-specific setter that accepts any type (for type preservation)
  const pmEnvSetAny = defineSandboxFn(
    ctx,
    "pmEnvSetAny",
    function (key: SandboxValue, value: SandboxValue, options: SandboxValue) {
      return pmSetAny(key, value, options)
    }
  )

  return {
    ...pwMethods,
    ...hoppMethods,
    ...pmMethods,
    ...cookieProps,
    ...envAccessors,
    // PM-specific env setter (preserves all types)
    pmEnvSetAny,
    // Expose the updated state accessors
    getUpdatedEnvs: () => {
      // Convert markers back to strings for UI display
      // (using centralized markers from constants/sandbox-markers.ts)

      // Handle case where envs is not provided
      if (!updatedEnvs) {
        return { global: [], selected: [] }
      }

      const convertMarkersToStrings = (env: SandboxValue) => {
        const convertValue = (value: SandboxValue) => {
          // Convert markers to string representations
          if (value === UNDEFINED_MARKER) return "undefined"
          if (value === NULL_MARKER) return "null"

          // Convert complex types (arrays, objects) to JSON strings for UI display
          // This prevents Vue UI from calling .match() on non-string values
          if (typeof value === "object" && value !== null) {
            try {
              return JSON.stringify(value)
            } catch (_) {
              // If JSON.stringify fails (circular refs, etc.), return string representation
              return String(value)
            }
          }

          // Convert all non-string primitives to strings for UI compatibility
          // Vue UI calls .match() on values, which only works on strings
          if (typeof value !== "string") {
            return String(value)
          }

          // Return strings as-is
          return value
        }

        return {
          ...env,
          currentValue: convertValue(env.currentValue),
          initialValue: convertValue(env.initialValue),
        }
      }

      return {
        global: (updatedEnvs.global || []).map(convertMarkersToStrings),
        selected: (updatedEnvs.selected || []).map(convertMarkersToStrings),
      }
    },
    getUpdatedCookies,
  }
}
