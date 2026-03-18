/* eslint-disable @typescript-eslint/no-unused-expressions */
;(inputs) => {
  // Keep strict mode scoped to this IIFE to avoid leaking strictness to concatenated/bootstrapped code
  "use strict"
  globalThis.pw = {
    env: {
      get: (key) => convertMarkerToValue(inputs.envGet(key)),
      getResolve: (key) => convertMarkerToValue(inputs.envGetResolve(key)),
      set: (key, value) => inputs.envSet(key, value),
      unset: (key) => inputs.envUnset(key),
      resolve: (key) => inputs.envResolve(key),
    },
  }

  const requestProps = {
    // Setter methods
    setUrl: (url) => inputs.setRequestUrl(url),
    setMethod: (method) => inputs.setRequestMethod(method),
    setHeader: (name, value) => inputs.setRequestHeader(name, value),
    setHeaders: (headers) => inputs.setRequestHeaders(headers),
    removeHeader: (key) => inputs.removeRequestHeader(key),
    setParam: (name, value) => inputs.setRequestParam(name, value),
    setParams: (params) => inputs.setRequestParams(params),
    removeParam: (key) => inputs.removeRequestParam(key),
    setBody: (body) => inputs.setRequestBody(body),
    setAuth: (auth) => inputs.setRequestAuth(auth),

    // Request variables
    variables: {
      get: (key) => inputs.getRequestVariable(key),
      set: (key, value) => inputs.setRequestVariable(key, value),
    },
  }

  // Define all properties with unified read-only protection
  ;["url", "method", "params", "headers", "body", "auth"].forEach((prop) => {
    Object.defineProperty(requestProps, prop, {
      enumerable: true,
      configurable: false,
      get() {
        const currentValues = inputs.getRequestProps()
        return currentValues[prop]
      },
      set(_value) {
        throw new TypeError(`hopp.request.${prop} is read-only`)
      },
    })
  })

  // Freeze the entire requestProps object for additional protection
  Object.freeze(requestProps)

  // Special markers for undefined and null values to preserve them across sandbox boundary
  // NOTE: These values MUST match constants/sandbox-markers.ts
  // (Cannot import directly as this runs in QuickJS sandbox)
  const UNDEFINED_MARKER = "__HOPPSCOTCH_UNDEFINED__"
  const NULL_MARKER = "__HOPPSCOTCH_NULL__"

  // Helper function to convert markers back to their original values
  const convertMarkerToValue = (value) => {
    if (value === UNDEFINED_MARKER) return undefined
    if (value === NULL_MARKER) return null
    return value
  }

  globalThis.hopp = {
    env: {
      get: (key) => {
        return convertMarkerToValue(
          inputs.envGetResolve(key, {
            fallbackToNull: true,
            source: "all",
          })
        )
      },
      getRaw: (key) => {
        return convertMarkerToValue(
          inputs.envGet(key, {
            fallbackToNull: true,
            source: "all",
          })
        )
      },
      set: (key, value) => inputs.envSet(key, value),
      delete: (key) => inputs.envUnset(key),
      reset: (key) => inputs.envReset(key),
      getInitialRaw: (key) => {
        return convertMarkerToValue(inputs.envGetInitialRaw(key))
      },
      setInitial: (key, value) => inputs.envSetInitial(key, value),

      active: {
        get: (key) => {
          return convertMarkerToValue(
            inputs.envGetResolve(key, {
              fallbackToNull: true,
              source: "active",
            })
          )
        },
        getRaw: (key) => {
          return convertMarkerToValue(
            inputs.envGet(key, {
              fallbackToNull: true,
              source: "active",
            })
          )
        },
        set: (key, value) => inputs.envSet(key, value, { source: "active" }),
        delete: (key) => inputs.envUnset(key, { source: "active" }),
        reset: (key) => inputs.envReset(key, { source: "active" }),
        getInitialRaw: (key) => {
          return convertMarkerToValue(
            inputs.envGetInitialRaw(key, { source: "active" })
          )
        },
        setInitial: (key, value) =>
          inputs.envSetInitial(key, value, { source: "active" }),
      },

      global: {
        get: (key) => {
          return convertMarkerToValue(
            inputs.envGetResolve(key, {
              fallbackToNull: true,
              source: "global",
            })
          )
        },
        getRaw: (key) => {
          return convertMarkerToValue(
            inputs.envGet(key, {
              fallbackToNull: true,
              source: "global",
            })
          )
        },
        set: (key, value) => inputs.envSet(key, value, { source: "global" }),
        delete: (key) => inputs.envUnset(key, { source: "global" }),
        reset: (key) => inputs.envReset(key, { source: "global" }),
        getInitialRaw: (key) => {
          return convertMarkerToValue(
            inputs.envGetInitialRaw(key, { source: "global" })
          )
        },
        setInitial: (key, value) =>
          inputs.envSetInitial(key, value, { source: "global" }),
      },
    },
    request: requestProps,
    cookies: {
      get: (domain, name) => inputs.cookieGet(domain, name),
      set: (domain, cookie) => inputs.cookieSet(domain, cookie),
      has: (domain, name) => inputs.cookieHas(domain, name),
      getAll: (domain) => inputs.cookieGetAll(domain),
      delete: (domain, name) => inputs.cookieDelete(domain, name),
      clear: (domain) => inputs.cookieClear(domain),
    },
    // Expose fetch as hopp.fetch() for explicit access
    // Note: This exposes the fetch implementation provided by the host environment via hoppFetchHook
    // (injected in cage.ts during sandbox initialization), not the native browser fetch.
    // This allows requests to respect interceptor settings.
    fetch: fetch,
  }

  // Make global fetch() an alias to hopp.fetch()
  // Both fetch() and hopp.fetch() respect interceptor settings
  if (typeof fetch !== "undefined") {
    globalThis.fetch = globalThis.hopp.fetch
  }

  // PM Namespace - Postman Compatibility Layer
  globalThis.pm = {
    environment: {
      get: (key) => {
        const value = globalThis.hopp.env.active.get(key)
        // Postman returns undefined for missing keys, not null
        return value === null ? undefined : value
      },
      set: (key, value) => {
        // PM namespace preserves all types - use pmEnvSetAny directly
        if (typeof value === "undefined") {
          return inputs.pmEnvSetAny(key, UNDEFINED_MARKER, { source: "active" })
        } else if (value === null) {
          return inputs.pmEnvSetAny(key, NULL_MARKER, { source: "active" })
        } else {
          return inputs.pmEnvSetAny(key, value, { source: "active" })
        }
      },
      unset: (key) => globalThis.hopp.env.active.delete(key),
      has: (key) => globalThis.hopp.env.active.get(key) !== null,
      clear: () => {
        // Get all active environment variables and delete them
        const envVars = inputs.getAllSelectedEnvs()
        envVars.forEach((envVar) => {
          globalThis.hopp.env.active.delete(envVar.key)
        })
      },
      toObject: () => {
        // Get all active environment variables as an object
        const envVars = inputs.getAllSelectedEnvs()
        const result = {}
        envVars.forEach((envVar) => {
          const value = globalThis.hopp.env.active.get(envVar.key)
          if (value !== null) {
            result[envVar.key] = value
          }
        })
        return result
      },
    },

    globals: {
      get: (key) => {
        const value = globalThis.hopp.env.global.get(key)
        // Postman returns undefined for missing keys, not null
        return value === null ? undefined : value
      },
      set: (key, value) => {
        // PM namespace preserves all types - use pmEnvSetAny directly
        if (typeof value === "undefined") {
          return inputs.pmEnvSetAny(key, UNDEFINED_MARKER, { source: "global" })
        } else if (value === null) {
          return inputs.pmEnvSetAny(key, NULL_MARKER, { source: "global" })
        } else {
          return inputs.pmEnvSetAny(key, value, { source: "global" })
        }
      },
      unset: (key) => globalThis.hopp.env.global.delete(key),
      has: (key) => globalThis.hopp.env.global.get(key) !== null,
      clear: () => {
        // Get all global environment variables and delete them
        const envVars = inputs.getAllGlobalEnvs()
        envVars.forEach((envVar) => {
          globalThis.hopp.env.global.delete(envVar.key)
        })
      },
      toObject: () => {
        // Get all global environment variables as an object
        const envVars = inputs.getAllGlobalEnvs()
        const result = {}
        envVars.forEach((envVar) => {
          const value = globalThis.hopp.env.global.get(envVar.key)
          if (value !== null) {
            result[envVar.key] = value
          }
        })
        return result
      },
    },

    variables: {
      get: (key) => {
        const value = globalThis.hopp.env.get(key)
        // Postman returns undefined for missing keys, not null
        return value === null ? undefined : value
      },
      set: (key, value) => {
        // PM namespace preserves all types - use pmEnvSetAny directly
        // variables.set uses active scope
        if (typeof value === "undefined") {
          return inputs.pmEnvSetAny(key, UNDEFINED_MARKER, { source: "active" })
        } else if (value === null) {
          return inputs.pmEnvSetAny(key, NULL_MARKER, { source: "active" })
        } else {
          return inputs.pmEnvSetAny(key, value, { source: "active" })
        }
      },
      has: (key) => globalThis.hopp.env.get(key) !== null,
      replaceIn: (template) => {
        if (typeof template !== "string") return template
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const value = globalThis.hopp.env.get(key.trim())
          return value !== null ? value : match
        })
      },
    },

    request: {
      // ID and name (read-only, exposed from inputs)
      get id() {
        return inputs.pmInfoRequestId()
      },

      get name() {
        return inputs.pmInfoRequestName()
      },

      // Certificate and proxy (read-only, not accessible in scripts)
      // These are configured at app/collection level in Postman, not in scripts
      get certificate() {
        return undefined
      },

      get proxy() {
        return undefined
      },

      // URL - Mutable with Postman-compatible structure
      get url() {
        // Return Postman-compatible URL object
        const urlObj = {
          // toString reads current URL dynamically (not cached)
          toString: () => globalThis.hopp.request.url,

          // Helper to parse URL into components
          _parseUrl: () => {
            const urlString = globalThis.hopp.request.url
            try {
              const parsed = new URL(urlString)

              // Get query params from URL
              const urlParams = Array.from(parsed.searchParams.entries()).map(
                ([key, value]) => ({ key, value })
              )

              // Only merge from hopp.request.params if URL has no query params
              // This supports imported collections while allowing mutations to work
              let finalParams = urlParams
              if (urlParams.length === 0) {
                // No params in URL - check hopp.request.params (for imported collections)
                const requestParams = globalThis.hopp.request.params || []
                const activeRequestParams = requestParams
                  .filter((p) => p.active !== false)
                  .map((p) => ({ key: p.key, value: p.value }))
                finalParams = activeRequestParams
              }

              return {
                protocol: parsed.protocol.slice(0, -1), // Remove trailing :
                host: parsed.hostname.split("."),
                port:
                  parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
                path: parsed.pathname.split("/").filter(Boolean),
                queryParams: finalParams,
                hash: parsed.hash ? parsed.hash.slice(1) : "", // Remove leading #
              }
            } catch {
              // Fallback: try to get params from hopp.request.params
              const requestParams = globalThis.hopp.request?.params || []
              const activeParams = requestParams
                .filter((p) => p.active !== false)
                .map((p) => ({ key: p.key, value: p.value }))

              return {
                protocol: "https",
                host: [],
                port: "443",
                path: [],
                queryParams: activeParams,
              }
            }
          },

          // Helper to rebuild URL from components
          _rebuildUrl: (components) => {
            const protocol = components.protocol || "https"
            const host = Array.isArray(components.host)
              ? components.host.join(".")
              : components.host
            const port =
              components.port &&
              components.port !== "443" &&
              components.port !== "80"
                ? `:${components.port}`
                : ""
            const path = Array.isArray(components.path)
              ? "/" + components.path.join("/")
              : components.path
            const query =
              components.queryParams && components.queryParams.length > 0
                ? "?" +
                  components.queryParams
                    .map(
                      (p) =>
                        `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
                    )
                    .join("&")
                : ""
            const hash = components.hash ? `#${components.hash}` : ""
            return `${protocol}://${host}${port}${path}${query}${hash}`
          },

          // Postman-compatible URL methods
          getHost: () => urlObj._parseUrl().host.join("."),

          getPath: (_unresolved = false) => {
            const pathArray = urlObj._parseUrl().path
            return pathArray.length > 0 ? "/" + pathArray.join("/") : "/"
          },

          getPathWithQuery: () => {
            const parsed = urlObj._parseUrl()
            const path =
              parsed.path.length > 0 ? "/" + parsed.path.join("/") : "/"
            const query =
              parsed.queryParams.length > 0
                ? "?" +
                  parsed.queryParams
                    .map(
                      (p) =>
                        `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
                    )
                    .join("&")
                : ""
            return path + query
          },

          getQueryString: (_options = {}) => {
            const params = urlObj._parseUrl().queryParams
            if (params.length === 0) return ""
            return params
              .map(
                (p) =>
                  `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
              )
              .join("&")
          },

          getRemote: (forcePort = false) => {
            const parsed = urlObj._parseUrl()
            const host = parsed.host.join(".")
            const showPort =
              forcePort || (parsed.port !== "443" && parsed.port !== "80")
            return showPort ? `${host}:${parsed.port}` : host
          },

          update: (urlString) => {
            if (typeof urlString === "string") {
              globalThis.hopp.request.setUrl(urlString)
            } else if (
              urlString &&
              typeof urlString === "object" &&
              typeof urlString.toString === "function"
            ) {
              globalThis.hopp.request.setUrl(urlString.toString())
            } else {
              throw new Error(
                "URL update requires a string or object with toString() method"
              )
            }
          },

          addQueryParams: (params) => {
            if (!Array.isArray(params)) {
              throw new Error("addQueryParams requires an array of parameters")
            }
            const currentParsed = urlObj._parseUrl()
            params.forEach((param) => {
              if (param && param.key) {
                currentParsed.queryParams.push({
                  key: param.key,
                  value: param.value || "",
                })
              }
            })
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(currentParsed))
          },

          removeQueryParams: (params) => {
            if (!Array.isArray(params) && typeof params !== "string") {
              throw new Error(
                "removeQueryParams requires an array of param names or a single param name"
              )
            }
            const keysToRemove = Array.isArray(params) ? params : [params]
            const currentParsed = urlObj._parseUrl()
            const updatedParams = currentParsed.queryParams.filter(
              (p) => !keysToRemove.includes(p.key)
            )
            currentParsed.queryParams = updatedParams
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(currentParsed))
            // Also update the params array to ensure consistency
            globalThis.hopp.request.setParams(
              updatedParams.map((p) => ({
                key: p.key,
                value: p.value,
                active: true,
                description: "",
              }))
            )
          },
        }

        // Lazy-loaded mutable properties
        Object.defineProperty(urlObj, "protocol", {
          get: () => urlObj._parseUrl().protocol,
          set: (value) => {
            const parsed = urlObj._parseUrl()
            parsed.protocol = value
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(parsed))
          },
          enumerable: true,
        })

        Object.defineProperty(urlObj, "host", {
          get: () => urlObj._parseUrl().host,
          set: (value) => {
            const parsed = urlObj._parseUrl()
            parsed.host = Array.isArray(value) ? value : value.split(".")
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(parsed))
          },
          enumerable: true,
        })

        // hostname is an alias for host as a string
        Object.defineProperty(urlObj, "hostname", {
          get: () => urlObj._parseUrl().host.join("."),
          set: (value) => {
            const parsed = urlObj._parseUrl()
            parsed.host = String(value).split(".")
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(parsed))
          },
          enumerable: true,
        })

        Object.defineProperty(urlObj, "port", {
          get: () => urlObj._parseUrl().port,
          set: (value) => {
            const parsed = urlObj._parseUrl()
            parsed.port = String(value)
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(parsed))
          },
          enumerable: true,
        })

        Object.defineProperty(urlObj, "path", {
          get: () => urlObj._parseUrl().path,
          set: (value) => {
            const parsed = urlObj._parseUrl()
            parsed.path = Array.isArray(value)
              ? value
              : value.split("/").filter(Boolean)
            globalThis.hopp.request.setUrl(urlObj._rebuildUrl(parsed))
          },
          enumerable: true,
        })

        // hash property for URL fragments
        Object.defineProperty(urlObj, "hash", {
          get: () => {
            try {
              const parsed = new URL(globalThis.hopp.request.url)
              return parsed.hash ? parsed.hash.slice(1) : ""
            } catch {
              return ""
            }
          },
          set: (value) => {
            const current = globalThis.hopp.request.url
            const baseUrl = current.split("#")[0]
            const hashValue = value
              ? value.startsWith("#")
                ? value
                : `#${value}`
              : ""
            globalThis.hopp.request.setUrl(baseUrl + hashValue)
          },
          enumerable: true,
        })

        Object.defineProperty(urlObj, "query", {
          get: () => {
            return {
              // Basic manipulation methods
              add: (param) => {
                if (!param || !param.key)
                  throw new Error("Query param must have a 'key' property")
                const currentParsed = urlObj._parseUrl()
                currentParsed.queryParams.push({
                  key: param.key,
                  value: param.value || "",
                })
                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
              },

              remove: (key) => {
                if (typeof key !== "string")
                  throw new Error("Query param key must be a string")
                const currentParsed = urlObj._parseUrl()
                currentParsed.queryParams = currentParsed.queryParams.filter(
                  (p) => p.key !== key
                )
                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
              },

              upsert: (param) => {
                if (!param || !param.key)
                  throw new Error("Query param must have a 'key' property")
                const currentParsed = urlObj._parseUrl()
                const idx = currentParsed.queryParams.findIndex(
                  (p) => p.key === param.key
                )
                if (idx >= 0) {
                  currentParsed.queryParams[idx].value = param.value || ""
                } else {
                  currentParsed.queryParams.push({
                    key: param.key,
                    value: param.value || "",
                  })
                }
                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
              },

              clear: () => {
                const currentParsed = urlObj._parseUrl()
                currentParsed.queryParams = []
                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
                // Also clear the params array to ensure consistency
                globalThis.hopp.request.setParams([])
              },

              // Read methods
              get: (key) => {
                const params = urlObj._parseUrl().queryParams
                const param = params.find((p) => p.key === key)
                return param ? param.value : null
              },

              has: (key) => {
                const params = urlObj._parseUrl().queryParams
                return params.some((p) => p.key === key)
              },

              all: () => {
                const currentParsed = urlObj._parseUrl()
                const result = {}

                // Handle duplicate keys by converting to arrays
                currentParsed.queryParams.forEach((p) => {
                  if (Object.prototype.hasOwnProperty.call(result, p.key)) {
                    if (!Array.isArray(result[p.key])) {
                      result[p.key] = [result[p.key]]
                    }
                    result[p.key].push(p.value)
                  } else {
                    result[p.key] = p.value
                  }
                })

                return result
              },

              toObject: () => {
                // Alias for all() for Postman compatibility
                return urlObj.query.all()
              },

              // PropertyList iteration methods
              each: (callback) => {
                const params = urlObj._parseUrl().queryParams
                params.forEach(callback)
              },

              map: (callback) => {
                const params = urlObj._parseUrl().queryParams
                return params.map(callback)
              },

              filter: (callback) => {
                const params = urlObj._parseUrl().queryParams
                return params.filter(callback)
              },

              count: () => {
                return urlObj._parseUrl().queryParams.length
              },

              idx: (index) => {
                const params = urlObj._parseUrl().queryParams
                return params[index] || null
              },

              // Advanced PropertyList methods
              find: (rule, context) => {
                const params = urlObj._parseUrl().queryParams
                if (typeof rule === "function") {
                  return (
                    params.find(context ? rule.bind(context) : rule) || null
                  )
                }
                // String rule: find by key
                if (typeof rule === "string") {
                  return params.find((p) => p.key === rule) || null
                }
                return null
              },

              indexOf: (item) => {
                const params = urlObj._parseUrl().queryParams
                if (typeof item === "string") {
                  // Find by key
                  return params.findIndex((p) => p.key === item)
                }
                if (item && typeof item === "object" && item.key) {
                  // Find by object with key
                  return params.findIndex((p) => p.key === item.key)
                }
                return -1
              },

              insert: (item, before) => {
                if (!item || !item.key)
                  throw new Error("Query param must have a 'key' property")
                const currentParsed = urlObj._parseUrl()

                if (before) {
                  // Find position to insert before
                  const beforeIdx = currentParsed.queryParams.findIndex(
                    (p) => p.key === before
                  )
                  if (beforeIdx >= 0) {
                    currentParsed.queryParams.splice(beforeIdx, 0, {
                      key: item.key,
                      value: item.value || "",
                    })
                  } else {
                    // If 'before' not found, append to end
                    currentParsed.queryParams.push({
                      key: item.key,
                      value: item.value || "",
                    })
                  }
                } else {
                  // No 'before' specified, add to end
                  currentParsed.queryParams.push({
                    key: item.key,
                    value: item.value || "",
                  })
                }

                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
              },

              append: (item) => {
                if (!item || !item.key)
                  throw new Error("Query param must have a 'key' property")
                const currentParsed = urlObj._parseUrl()

                // Remove existing instances of this key
                currentParsed.queryParams = currentParsed.queryParams.filter(
                  (p) => p.key !== item.key
                )

                // Add at end
                currentParsed.queryParams.push({
                  key: item.key,
                  value: item.value || "",
                })

                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
              },

              assimilate: (source, prune) => {
                if (!source || typeof source !== "object") {
                  throw new Error("Source must be an array or object")
                }

                const currentParsed = urlObj._parseUrl()

                // Convert source to array format
                let sourceArray
                if (Array.isArray(source)) {
                  sourceArray = source
                } else {
                  // Convert object to array of {key, value}
                  sourceArray = Object.entries(source).map(([key, value]) => ({
                    key,
                    value: String(value),
                  }))
                }

                // Update or add each item from source
                sourceArray.forEach((item) => {
                  if (!item || !item.key) return
                  const idx = currentParsed.queryParams.findIndex(
                    (p) => p.key === item.key
                  )
                  if (idx >= 0) {
                    // Update existing
                    currentParsed.queryParams[idx].value = item.value || ""
                  } else {
                    // Add new
                    currentParsed.queryParams.push({
                      key: item.key,
                      value: item.value || "",
                    })
                  }
                })

                if (prune) {
                  // Remove params not in source
                  const sourceKeys = sourceArray
                    .filter((i) => i && i.key)
                    .map((i) => i.key)
                  currentParsed.queryParams = currentParsed.queryParams.filter(
                    (p) => sourceKeys.includes(p.key)
                  )
                }

                globalThis.hopp.request.setUrl(
                  urlObj._rebuildUrl(currentParsed)
                )
              },
            }
          },
          enumerable: true,
        })

        return urlObj
      },

      // URL setter (Postman pattern: pm.request.url = "...")
      set url(value) {
        let urlString
        if (typeof value === "string") {
          urlString = value
        } else if (value && typeof value.toString === "function") {
          urlString = value.toString()
        } else {
          throw new Error("URL must be a string or have a toString() method")
        }

        globalThis.hopp.request.setUrl(urlString)

        // Parse query params from the new URL and update params array
        try {
          const parsed = new URL(urlString)
          const urlParams = Array.from(parsed.searchParams.entries()).map(
            ([key, value]) => ({ key, value, active: true, description: "" })
          )
          globalThis.hopp.request.setParams(urlParams)
        } catch {
          // If URL parsing fails, clear params
          globalThis.hopp.request.setParams([])
        }
      },

      // Method - Mutable
      // NOTE: Postman does NOT normalize method to uppercase, so we preserve the original case
      get method() {
        return globalThis.hopp.request.method
      },

      set method(value) {
        if (typeof value !== "string") {
          throw new Error(
            "Method must be a string (GET, POST, PUT, DELETE, etc.)"
          )
        }
        globalThis.hopp.request.setMethod(value)
      },

      // Headers - With Postman mutation methods and PropertyList interface
      get headers() {
        return {
          // Read methods
          get: (name) => {
            const headers = globalThis.hopp.request.headers
            const header = headers.find(
              (h) => h.key.toLowerCase() === name.toLowerCase()
            )
            return header ? header.value : null
          },

          has: (name) => {
            const headers = globalThis.hopp.request.headers
            return headers.some(
              (h) => h.key.toLowerCase() === name.toLowerCase()
            )
          },

          all: () => {
            const result = {}
            globalThis.hopp.request.headers.forEach((header) => {
              result[header.key] = header.value
            })
            return result
          },

          toObject: () => {
            // Alias for all() for Postman compatibility
            const result = {}
            globalThis.hopp.request.headers.forEach((header) => {
              result[header.key] = header.value
            })
            return result
          },

          // Mutation methods (Postman compatibility)
          add: (header) => {
            if (!header || typeof header !== "object") {
              throw new Error(
                "Header must be an object with 'key' and 'value' properties"
              )
            }
            if (!header.key) {
              throw new Error("Header must have a 'key' property")
            }
            globalThis.hopp.request.setHeader(header.key, header.value || "")
          },

          remove: (headerName) => {
            if (typeof headerName !== "string") {
              throw new Error("Header name must be a string")
            }
            globalThis.hopp.request.removeHeader(headerName)
          },

          upsert: (header) => {
            if (!header || typeof header !== "object") {
              throw new Error(
                "Header must be an object with 'key' and 'value' properties"
              )
            }
            if (!header.key) {
              throw new Error("Header must have a 'key' property")
            }
            // Remove existing (case-insensitive) then add
            globalThis.hopp.request.removeHeader(header.key)
            globalThis.hopp.request.setHeader(header.key, header.value || "")
          },

          clear: () => {
            globalThis.hopp.request.setHeaders([])
          },

          // PropertyList iteration methods
          each: (callback) => {
            globalThis.hopp.request.headers.forEach(callback)
          },

          map: (callback) => {
            return globalThis.hopp.request.headers.map(callback)
          },

          filter: (callback) => {
            return globalThis.hopp.request.headers.filter(callback)
          },

          count: () => {
            return globalThis.hopp.request.headers.length
          },

          idx: (index) => {
            return globalThis.hopp.request.headers[index] || null
          },

          // Advanced PropertyList methods
          find: (rule, context) => {
            const headers = globalThis.hopp.request.headers
            if (typeof rule === "function") {
              return headers.find(context ? rule.bind(context) : rule) || null
            }
            // String rule: find by key (case-insensitive)
            if (typeof rule === "string") {
              return (
                headers.find(
                  (h) => h.key.toLowerCase() === rule.toLowerCase()
                ) || null
              )
            }
            return null
          },

          indexOf: (item) => {
            const headers = globalThis.hopp.request.headers
            if (typeof item === "string") {
              // Find by key (case-insensitive)
              return headers.findIndex(
                (h) => h.key.toLowerCase() === item.toLowerCase()
              )
            }
            if (item && typeof item === "object" && item.key) {
              // Find by object with key (case-insensitive)
              return headers.findIndex(
                (h) => h.key.toLowerCase() === item.key.toLowerCase()
              )
            }
            return -1
          },

          insert: (item, before) => {
            if (!item || !item.key)
              throw new Error("Header must have a 'key' property")

            const headers = globalThis.hopp.request.headers

            if (before) {
              // Find position to insert before (case-insensitive)
              const beforeIdx = headers.findIndex(
                (h) => h.key.toLowerCase() === before.toLowerCase()
              )
              if (beforeIdx >= 0) {
                const newHeaders = [...headers]
                newHeaders.splice(beforeIdx, 0, {
                  key: item.key,
                  value: item.value || "",
                  active: true,
                })
                globalThis.hopp.request.setHeaders(newHeaders)
              } else {
                // If 'before' not found, append to end
                globalThis.hopp.request.setHeader(item.key, item.value || "")
              }
            } else {
              // No 'before' specified, add to end
              globalThis.hopp.request.setHeader(item.key, item.value || "")
            }
          },

          append: (item) => {
            if (!item || !item.key)
              throw new Error("Header must have a 'key' property")

            // Remove existing instances of this key (case-insensitive)
            globalThis.hopp.request.removeHeader(item.key)

            // Add at end
            globalThis.hopp.request.setHeader(item.key, item.value || "")
          },

          assimilate: (source, prune) => {
            if (!source || typeof source !== "object") {
              throw new Error("Source must be an array or object")
            }

            let sourceArray

            if (Array.isArray(source)) {
              sourceArray = source
            } else {
              // Convert object to array of {key, value}
              sourceArray = Object.entries(source).map(([key, value]) => ({
                key,
                value: String(value),
                active: true,
              }))
            }

            // Update or add each item from source
            sourceArray.forEach((item) => {
              if (!item || !item.key) return
              // Remove existing (case-insensitive)
              globalThis.hopp.request.removeHeader(item.key)
              // Add new/updated
              globalThis.hopp.request.setHeader(item.key, item.value || "")
            })

            if (prune) {
              // Remove headers not in source (case-insensitive)
              const sourceKeys = sourceArray
                .filter((i) => i && i.key)
                .map((i) => i.key.toLowerCase())
              const currentHeaders = globalThis.hopp.request.headers
              const filteredHeaders = currentHeaders.filter((h) =>
                sourceKeys.includes(h.key.toLowerCase())
              )
              globalThis.hopp.request.setHeaders(filteredHeaders)
            }
          },
        }
      },

      // Body - With Postman update() method
      get body() {
        const currentBody = globalThis.hopp.request.body

        // Return body with update() method
        return {
          // Spread current body properties
          ...currentBody,

          // Postman-compatible update() method
          update: (bodySpec) => {
            if (typeof bodySpec === "string") {
              // Direct string assignment
              globalThis.hopp.request.setBody({
                contentType: "text/plain",
                body: bodySpec,
              })
            } else if (bodySpec && typeof bodySpec === "object") {
              const mode = bodySpec.mode || "raw"

              switch (mode) {
                case "raw":
                  globalThis.hopp.request.setBody({
                    contentType:
                      bodySpec.options?.raw?.language === "json"
                        ? "application/json"
                        : "text/plain",
                    body: bodySpec.raw || "",
                  })
                  break

                case "urlencoded":
                  globalThis.hopp.request.setBody({
                    contentType: "application/x-www-form-urlencoded",
                    body: bodySpec.urlencoded || [],
                  })
                  break

                case "formdata":
                  globalThis.hopp.request.setBody({
                    contentType: "multipart/form-data",
                    body: bodySpec.formdata || [],
                  })
                  break

                case "file":
                  globalThis.hopp.request.setBody({
                    contentType: "binary",
                    body: bodySpec.file || null,
                  })
                  break

                default:
                  throw new Error(
                    `Unsupported body mode: ${mode}. Supported modes: raw, urlencoded, formdata, file`
                  )
              }
            } else {
              throw new Error(
                "Body spec must be a string or object with mode property"
              )
            }
          },
        }
      },

      // Body setter (legacy pattern for direct assignment)
      set body(value) {
        if (typeof value === "string") {
          globalThis.hopp.request.setBody({
            contentType: "text/plain",
            body: value,
          })
        } else if (typeof value === "object" && value !== null) {
          globalThis.hopp.request.setBody({
            contentType: "application/json",
            body: JSON.stringify(value),
          })
        } else {
          throw new Error("Body must be a string or object")
        }
      },

      // Auth - Mutable
      get auth() {
        return globalThis.hopp.request.auth
      },

      set auth(value) {
        if (value === null || value === undefined) {
          globalThis.hopp.request.setAuth({
            authType: "none",
            authActive: false,
          })
        } else if (typeof value === "object") {
          globalThis.hopp.request.setAuth(value)
        } else {
          throw new Error("Auth must be an object or null")
        }
      },

      // Custom serialization for console.log to ensure consistent behavior
      // This method is called by faraday-cage's marshalling system
      toJSON() {
        // Return a plain object with all properties expanded
        // This ensures console.log(pm.request) shows the full structure consistently
        const urlParsed = this.url._parseUrl()
        return {
          id: this.id,
          name: this.name,
          url: {
            protocol: urlParsed.protocol,
            host: urlParsed.host,
            hostname: urlParsed.host.join("."),
            port: urlParsed.port,
            path: urlParsed.path,
            hash: urlParsed.hash || "",
            query: this.url.query.all(),
          },
          method: this.method,
          headers: this.headers.toObject(),
          body: this.body,
          auth: this.auth,
        }
      },

      toString() {
        return `Request { id: ${this.id}, name: ${this.name}, method: ${this.method}, url: ${this.url.toString()} }`
      },

      [Symbol.toStringTag]: "Request",
    },

    // Script context information
    info: {
      eventName: "pre-request",
      get requestName() {
        return inputs.pmInfoRequestName()
      },
      get requestId() {
        return inputs.pmInfoRequestId()
      },
      // Unsupported Collection Runner features
      get iteration() {
        throw new Error(
          "pm.info.iteration is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      get iterationCount() {
        throw new Error(
          "pm.info.iterationCount is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // pm.sendRequest() - Postman-compatible fetch wrapper
    sendRequest: (urlOrRequest, callback) => {
      // Check if fetch is available
      if (typeof fetch === "undefined") {
        const error = new Error(
          "pm.sendRequest() requires fetch API support. Enable experimental scripting sandbox or ensure fetch is available in your environment."
        )
        callback(error, null)
        return
      }

      // Parse arguments (Postman supports both string and object)
      let url, options

      if (typeof urlOrRequest === "string") {
        url = urlOrRequest
        options = {}
      } else {
        // Object format: { url, method, header, body }
        url = urlOrRequest.url

        // Parse headers - support both array [{key, value, disabled}] and object {key: value} formats
        let headers = {}
        if (urlOrRequest.header) {
          if (Array.isArray(urlOrRequest.header)) {
            // Array format: [{ key: 'Content-Type', value: 'application/json', disabled: false }]
            // Filter out disabled headers and handle duplicates properly
            const activeHeaders = urlOrRequest.header.filter(
              (h) => h.disabled !== true
            )

            // Check if there are duplicate keys (e.g., multiple Set-Cookie headers)
            const headerKeys = new Set()
            const hasDuplicates = activeHeaders.some((h) => {
              if (headerKeys.has(h.key.toLowerCase())) {
                return true
              }
              headerKeys.add(h.key.toLowerCase())
              return false
            })

            if (hasDuplicates) {
              // Use Headers API to properly handle duplicate headers
              const headersInit = new Headers()
              activeHeaders.forEach((h) => {
                headersInit.append(h.key, h.value)
              })
              headers = headersInit
            } else {
              // No duplicates - simple object is fine
              headers = Object.fromEntries(
                activeHeaders.map((h) => [h.key, h.value])
              )
            }
          } else if (typeof urlOrRequest.header === "object") {
            // Plain object format: { 'Content-Type': 'application/json' }
            headers = urlOrRequest.header
          }
        }

        options = {
          method: urlOrRequest.method || "GET",
          headers,
        }

        // Handle body based on mode
        if (urlOrRequest.body) {
          if (urlOrRequest.body.mode === "raw") {
            options.body = urlOrRequest.body.raw
          } else if (urlOrRequest.body.mode === "urlencoded") {
            const params = new URLSearchParams()
            urlOrRequest.body.urlencoded?.forEach((pair) => {
              params.append(pair.key, pair.value)
            })
            options.body = params.toString()
            // Use .set() for Headers instance, bracket notation for plain object
            if (options.headers instanceof Headers) {
              options.headers.set(
                "Content-Type",
                "application/x-www-form-urlencoded"
              )
            } else {
              options.headers["Content-Type"] =
                "application/x-www-form-urlencoded"
            }
          } else if (urlOrRequest.body.mode === "formdata") {
            const formData = new FormData()
            urlOrRequest.body.formdata?.forEach((pair) => {
              formData.append(pair.key, pair.value)
            })
            options.body = formData
          }
        }
      }

      // Track request start time for responseTime calculation
      const startTime = Date.now()

      // Call hopp.fetch() and adapt response
      globalThis.hopp
        .fetch(url, options)
        .then(async (response) => {
          // Convert Response to Postman response format
          try {
            const body = await response.text()
            // Calculate response metrics
            const responseTime = Date.now() - startTime
            const responseSize = new Blob([body]).size

            // Handle Set-Cookie headers specially as they can appear multiple times
            // The Fetch API's headers.entries() may not properly enumerate multiple Set-Cookie headers
            // Use getSetCookie() if available (modern Fetch API), otherwise fall back to entries()
            let headerEntries = []
            if (
              response.headers &&
              typeof response.headers.getSetCookie === "function"
            ) {
              // Modern Fetch API - getSetCookie() returns array of Set-Cookie values
              const setCookies = response.headers.getSetCookie()
              const otherHeaders = Array.from(response.headers.entries())
                .filter(([k]) => k.toLowerCase() !== "set-cookie")
                .map(([k, v]) => ({ key: k, value: v }))

              // Add each Set-Cookie as a separate header entry
              headerEntries = [
                ...otherHeaders,
                ...setCookies.map((value) => ({ key: "Set-Cookie", value })),
              ]
            } else {
              // Fallback: use entries() for all headers
              headerEntries = Array.from(response.headers.entries()).map(
                ([k, v]) => ({ key: k, value: v })
              )
            }

            // For Postman compatibility and test expectations, expose raw header entries array.
            // Attach helper methods (get/has) directly onto the array to mimic Postman SDK convenience APIs
            const headersArray = headerEntries.slice()
            try {
              Object.defineProperty(headersArray, "has", {
                value: (name) => {
                  const lowerName = String(name).toLowerCase()
                  return headerEntries.some(
                    (h) => h.key.toLowerCase() === lowerName
                  )
                },
                enumerable: false,
                configurable: true,
              })
              Object.defineProperty(headersArray, "get", {
                value: (name) => {
                  const lowerName = String(name).toLowerCase()
                  const header = headerEntries.find(
                    (h) => h.key.toLowerCase() === lowerName
                  )
                  return header ? header.value : null
                },
                enumerable: false,
                configurable: true,
              })
            } catch (_e) {
              // Non-fatal; plain array works for E2E expectations
            }

            const pmResponse = {
              code: response.status,
              status: response.statusText,
              headers: headersArray, // Array with helper methods
              body,
              responseTime: responseTime,
              responseSize: responseSize,
              text: () => body,
              json: () => {
                try {
                  return JSON.parse(body)
                } catch {
                  return null
                }
              },
              // Parse cookies from Set-Cookie headers (matching pm.response.cookies implementation)
              cookies: {
                get: (name) => {
                  // Parse cookies from Set-Cookie headers in the response
                  const setCookieHeaders = headerEntries.filter(
                    (h) => h.key.toLowerCase() === "set-cookie"
                  )

                  for (const header of setCookieHeaders) {
                    const cookieStr = header.value
                    const cookieName = cookieStr.split("=")[0].trim()
                    if (cookieName === name) {
                      // Extract cookie value (everything after first =, before first ;)
                      const parts = cookieStr.split(";")
                      const [, ...valueRest] = parts[0].split("=")
                      const value = valueRest.join("=").trim()
                      return value
                    }
                  }
                  return null
                },
                has: (name) => {
                  const setCookieHeaders = headerEntries.filter(
                    (h) => h.key.toLowerCase() === "set-cookie"
                  )

                  for (const header of setCookieHeaders) {
                    const cookieName = header.value.split("=")[0].trim()
                    if (cookieName === name) {
                      return true
                    }
                  }
                  return false
                },
                toObject: () => {
                  const setCookieHeaders = headerEntries.filter(
                    (h) => h.key.toLowerCase() === "set-cookie"
                  )

                  const cookies = {}
                  for (const header of setCookieHeaders) {
                    const parts = header.value.split(";")
                    const [nameValue] = parts
                    const [name, ...valueRest] = nameValue.split("=")
                    const value = valueRest.join("=").trim()
                    cookies[name.trim()] = value
                  }
                  return cookies
                },
              },
            }

            callback(null, pmResponse)
          } catch (textError) {
            // Handle response.text() errors
            callback(textError, null)
          }
        })
        .catch((error) => {
          callback(error, null)
        })
    },

    // Collection variables (unsupported)
    collectionVariables: {
      get: () => {
        throw new Error(
          "pm.collectionVariables.get() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      set: () => {
        throw new Error(
          "pm.collectionVariables.set() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.collectionVariables.unset() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      has: () => {
        throw new Error(
          "pm.collectionVariables.has() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      clear: () => {
        throw new Error(
          "pm.collectionVariables.clear() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      toObject: () => {
        throw new Error(
          "pm.collectionVariables.toObject() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
      replaceIn: () => {
        throw new Error(
          "pm.collectionVariables.replaceIn() is not supported in Hoppscotch (use environment or request variables instead)"
        )
      },
    },

    // Postman Vault (unsupported)
    vault: {
      get: () => {
        throw new Error(
          "pm.vault.get() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
      set: () => {
        throw new Error(
          "pm.vault.set() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.vault.unset() is not supported in Hoppscotch (Postman Vault feature)"
        )
      },
    },

    // Postman Visualizer (unsupported)
    visualizer: {
      set: () => {
        throw new Error(
          "pm.visualizer.set() is not supported in Hoppscotch (Postman Visualizer feature)"
        )
      },
      clear: () => {
        throw new Error(
          "pm.visualizer.clear() is not supported in Hoppscotch (Postman Visualizer feature)"
        )
      },
    },

    // Iteration data (unsupported)
    iterationData: {
      get: () => {
        throw new Error(
          "pm.iterationData.get() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      set: () => {
        throw new Error(
          "pm.iterationData.set() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      unset: () => {
        throw new Error(
          "pm.iterationData.unset() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      has: () => {
        throw new Error(
          "pm.iterationData.has() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      toObject: () => {
        throw new Error(
          "pm.iterationData.toObject() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      toJSON: () => {
        throw new Error(
          "pm.iterationData.toJSON() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Execution control (unsupported)
    execution: {
      location: (() => {
        const location = ["Hoppscotch"]
        Object.defineProperty(location, "current", {
          value: "Hoppscotch",
          writable: false,
          enumerable: true,
        })
        Object.freeze(location)
        return location
      })(),
      setNextRequest: () => {
        throw new Error(
          "pm.execution.setNextRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      skipRequest: () => {
        throw new Error(
          "pm.execution.skipRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
      runRequest: () => {
        throw new Error(
          "pm.execution.runRequest() is not supported in Hoppscotch (Collection Runner feature)"
        )
      },
    },

    // Package imports (unsupported)
    require: (packageName) => {
      throw new Error(
        `pm.require('${packageName}') is not supported in Hoppscotch (Package Library feature)`
      )
    },
  }
}
