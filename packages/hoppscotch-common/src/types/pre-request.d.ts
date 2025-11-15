type HoppRESTContentType =
  | null
  | "multipart/form-data"
  | "application/json"
  | "application/ld+json"
  | "application/hal+json"
  | "application/vnd.api+json"
  | "application/xml"
  | "text/xml"
  | "application/x-www-form-urlencoded"
  | "binary"
  | "text/html"
  | "text/plain"
  | "application/octet-stream"

interface HoppRESTHeader {
  key: string
  value: string
  active: boolean
  description: string
}

interface HoppRESTParam {
  key: string
  value: string
  active: boolean
  description: string
}

// Form data key-value pair for multipart/form-data
interface FormDataKeyValue {
  key: string
  active: boolean
  isFile: boolean
  value: string | Blob[] | null
}

interface HoppRESTReqBody {
  contentType: HoppRESTContentType
  body: string | null | File | FormDataKeyValue[]
}

interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: string
  maxAge?: number
  secure: boolean
  httpOnly: boolean
  sameSite: "None" | "Lax" | "Strict"
}

type AuthLocation = "HEADERS" | "QUERY_PARAMS"
type DigestAlgorithm = "MD5" | "MD5-sess"
type DigestQOP = "auth" | "auth-int"
type JWTAlgorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "ES256"
  | "ES384"
  | "ES512"
type HAWKAlgorithm = "sha256" | "sha1"

interface HoppRESTAuthNone {
  authType: "none"
  authActive: boolean
}

interface HoppRESTAuthInherit {
  authType: "inherit"
  authActive: boolean
}

interface HoppRESTAuthBasic {
  authType: "basic"
  authActive: boolean
  username: string
  password: string
}

interface HoppRESTAuthBearer {
  authType: "bearer"
  authActive: boolean
  token: string
}

interface HoppRESTAuthAPIKey {
  authType: "api-key"
  authActive: boolean
  key: string
  value: string
  addTo: AuthLocation
}

type OAuth2GrantTypeInfo =
  | {
      grantType: "AUTHORIZATION_CODE"
      authEndpoint: string
      tokenEndpoint: string
      clientID: string
      clientSecret?: string
      scopes?: string
      isPKCE?: boolean
      codeVerifierMethod?: "plain" | "S256"
      token?: string
    }
  | {
      grantType: "CLIENT_CREDENTIALS"
      tokenEndpoint: string
      clientID: string
      clientSecret?: string
      scopes?: string
      clientAuthentication?: "AS_BASIC_AUTH_HEADERS" | "IN_BODY"
    }
  | {
      grantType: "PASSWORD"
      tokenEndpoint: string
      clientID: string
      clientSecret?: string
      username: string
      password: string
      scopes?: string
    }
  | {
      grantType: "IMPLICIT"
      authEndpoint: string
      clientID: string
      scopes?: string
    }

interface HoppRESTAuthOAuth2 {
  authType: "oauth-2"
  authActive: boolean
  grantTypeInfo: OAuth2GrantTypeInfo
  addTo: AuthLocation
}

interface HoppRESTAuthAWSSignature {
  authType: "aws-signature"
  authActive: boolean
  accessKey: string
  secretKey: string
  region: string
  serviceName: string
  serviceToken?: string
  addTo: AuthLocation
}

interface HoppRESTAuthDigest {
  authType: "digest"
  authActive: boolean
  username: string
  password: string
  realm?: string
  nonce?: string
  algorithm: DigestAlgorithm
  qop: DigestQOP
  nc?: string
  cnonce?: string
  opaque?: string
  disableRetry: boolean
}

interface HoppRESTAuthHAWK {
  authType: "hawk"
  authActive: boolean
  authId: string
  authKey: string
  algorithm: HAWKAlgorithm
  includePayloadHash: boolean
  user?: string
  nonce?: string
  ext?: string
  app?: string
  dlg?: string
  timestamp?: string
}

interface HoppRESTAuthAkamaiEdgeGrid {
  authType: "akamai-eg"
  authActive: boolean
  accessToken: string
  clientToken: string
  clientSecret: string
  nonce?: string
  timestamp?: string
  host?: string
  headersToSign?: string
  maxBodySize?: string
}

interface HoppRESTAuthJWT {
  authType: "jwt"
  authActive: boolean
  secret: string
  privateKey?: string
  algorithm: JWTAlgorithm
  payload: string
  addTo: AuthLocation
  isSecretBase64Encoded: boolean
  headerPrefix: string
  paramName: string
  jwtHeaders: string
}

// Discriminated union for all auth types
type HoppRESTAuth =
  | HoppRESTAuthNone
  | HoppRESTAuthInherit
  | HoppRESTAuthBasic
  | HoppRESTAuthBearer
  | HoppRESTAuthAPIKey
  | HoppRESTAuthOAuth2
  | HoppRESTAuthAWSSignature
  | HoppRESTAuthDigest
  | HoppRESTAuthHAWK
  | HoppRESTAuthAkamaiEdgeGrid
  | HoppRESTAuthJWT

declare namespace pw {
  namespace env {
    function get(key: string): string
    function getResolve(key: string): string
    function set(key: string, value: string): void
    function unset(key: string): void
    function resolve(key: string): string
  }
}

declare namespace hopp {
  const env: Readonly<{
    get(key: string): string | null
    getRaw(key: string): string | null
    set(key: string, value: string): void
    delete(key: string): void
    reset(key: string): void
    getInitialRaw(key: string): string | null
    setInitial(key: string, value: string): void
    active: Readonly<{
      get(key: string): string | null
      getRaw(key: string): string | null
      set(key: string, value: string): void
      delete(key: string): void
      reset(key: string): void
      getInitialRaw(key: string): string | null
      setInitial(key: string, value: string): void
    }>
    global: Readonly<{
      get(key: string): string | null
      getRaw(key: string): string | null
      set(key: string, value: string): void
      delete(key: string): void
      reset(key: string): void
      getInitialRaw(key: string): string | null
      setInitial(key: string, value: string): void
    }>
  }>

  const request: Readonly<{
    readonly url: string
    readonly method: string
    readonly params: HoppRESTParam[]
    readonly headers: HoppRESTHeader[]
    readonly body: HoppRESTReqBody
    readonly auth: HoppRESTAuth
    setUrl(url: string): void
    setMethod(method: string): void
    setHeader(name: string, value: string): void
    setHeaders(headers: Array<Partial<HoppRESTHeader>>): void
    removeHeader(key: string): void
    setParam(name: string, value: string): void
    setParams(params: Array<Partial<HoppRESTParam>>): void
    removeParam(key: string): void
    /**
     * Set or update request body with automatic merging
     *
     * This method supports both partial updates and complete replacement:
     * - Partial updates: Merges provided fields with existing body configuration
     * - Complete replacement: When all fields are provided, replaces entire body
     *
     * @param body - Partial or complete HoppRESTReqBody object
     *`
     * @example
     * // Partial update - just change content type
     * hopp.request.setBody({ contentType: "application/xml" })
     *
     * // Partial update - just change body content
     * hopp.request.setBody({ body: JSON.stringify({ updated: true }) })
     *
     * // Complete replacement
     * hopp.request.setBody({
     *   contentType: "application/json",
     *   body: JSON.stringify({ name: "test", value: 123 })
     * })
     */
    setBody(body: Partial<HoppRESTReqBody>): void
    /**
     * Set or update authentication configuration with automatic merging
     *
     * This method supports both partial updates and complete replacement:
     * - Partial updates: Merges provided fields with existing auth configuration
     * - Complete replacement: When switching auth types, resets type-specific fields
     *
     * @param auth - Partial or complete HoppRESTAuth object
     *
     * @example
     * // Partial update - just change the token (merges with existing)
     * hopp.request.setAuth({ bearerToken: "new-token" })
     *
     * // Complete replacement - switch auth types
     * hopp.request.setAuth({
     *   authType: "basic",
     *   authActive: true,
     *   username: "user",
     *   password: "pass"
     * })
     *
     * // Update multiple fields while preserving others
     * hopp.request.setAuth({
     *   accessToken: "updated-token"
     * })
     */
    setAuth(auth: Partial<HoppRESTAuth>): void
    variables: Readonly<{
      get(key: string): string | null
      set(key: string, value: string): void
    }>
  }>

  const cookies: Readonly<{
    get(domain: string, name: string): Cookie | null
    set(domain: string, cookie: Cookie): void
    has(domain: string, name: string): boolean
    getAll(domain: string): Cookie[]
    delete(domain: string, name: string): void
    clear(domain: string): void
  }>
}

declare namespace pm {
  const environment: Readonly<{
    /**
     * Get an environment variable value
     * @param key - Variable key
     * @returns Variable value or undefined if not found
     */
    get(key: string): any
    /**
     * Set an environment variable
     * @param key - Variable key
     * @param value - Variable value
     */
    set(key: string, value: any): void
    /**
     * Remove an environment variable
     * @param key - Variable key to remove
     */
    unset(key: string): void
    /**
     * Check if an environment variable exists
     * @param key - Variable key to check
     * @returns true if variable exists, false otherwise
     */
    has(key: string): boolean
    /**
     * Clear all environment variables in the active environment
     */
    clear(): void
    /**
     * Get all environment variables as an object
     * @returns Object with all environment variables as key-value pairs
     */
    toObject(): Record<string, string>
  }>

  const globals: Readonly<{
    /**
     * Get a global variable value
     * @param key - Variable key
     * @returns Variable value or undefined if not found
     */
    get(key: string): any
    /**
     * Set a global variable
     * @param key - Variable key
     * @param value - Variable value (undefined is preserved, other types are coerced to strings)
     */
    set(key: string, value: any): void
    /**
     * Remove a global variable
     * @param key - Variable key to remove
     */
    unset(key: string): void
    /**
     * Check if a global variable exists
     * @param key - Variable key to check
     * @returns true if variable exists, false otherwise
     */
    has(key: string): boolean
    /**
     * Clear all global variables
     */
    clear(): void
    /**
     * Get all global variables as an object
     * @returns Object with all global variables as key-value pairs
     */
    toObject(): Record<string, string>
  }>

  const variables: Readonly<{
    /**
     * Get a variable value from either environment or global scope
     * Environment variables take precedence over global variables
     * @param key - Variable key
     * @returns Variable value or undefined if not found
     */
    get(key: string): any
    /**
     * Set a variable in the active environment scope
     * @param key - Variable key
     * @param value - Variable value (undefined is preserved, other types are coerced to strings)
     */
    set(key: string, value: any): void
    /**
     * Check if a variable exists in either environment or global scope
     * @param key - Variable key to check
     * @returns true if variable exists, false otherwise
     */
    has(key: string): boolean
    /**
     * Replace variables in a template string
     * @param template - Template string with {{variable}} placeholders
     * @returns String with variables replaced with their values
     */
    replaceIn(template: string): string
  }>

  /**
   * Request object with full Postman compatibility
   * All properties are mutable in pre-request scripts to match Postman behavior
   */
  let request: {
    // ID and name (read-only)
    readonly id: string
    readonly name: string

    /**
     * Client certificate used for mutual TLS authentication
     * In Postman, certificates are configured at the app/collection level, not programmatically in scripts
     * Returns undefined in Hoppscotch as certificate configuration is handled at the application level
     * @see https://learning.postman.com/docs/sending-requests/certificates/
     */
    readonly certificate:
      | {
          readonly name: string
          readonly matches: string[]
          readonly key: { readonly src: string }
          readonly cert: { readonly src: string }
          readonly passphrase?: string
        }
      | undefined

    /**
     * Proxy configuration for the request
     * In Postman, proxy is configured at the app level, not programmatically in scripts
     * Returns undefined in Hoppscotch as proxy configuration is handled at the application level
     * @see https://learning.postman.com/docs/sending-requests/capturing-request-data/proxy/
     */
    readonly proxy:
      | {
          readonly host: string
          readonly port: number
          readonly tunnel: boolean
          readonly disabled: boolean
        }
      | undefined

    // URL - Fully mutable with Postman URL object structure
    // Intersection type allows both string assignment AND object access
    url: string & {
      toString(): string
      protocol: string
      host: string[]
      port: string
      path: string[]
      hash: string

      // URL Helper Methods (Postman-compatible)
      /**
       * Get the hostname as a string (e.g., "api.example.com")
       * @returns The hostname portion of the URL
       */
      getHost(): string
      /**
       * Get the path with leading slash (e.g., "/v1/users")
       * @param unresolved - If true, returns unresolved path with variables (currently ignored)
       * @returns The path portion of the URL
       */
      getPath(unresolved?: boolean): string
      /**
       * Get the path with query string (e.g., "/v1/users?page=1")
       * @returns Path and query string combined
       */
      getPathWithQuery(): string
      /**
       * Get the query string without leading ? (e.g., "page=1&limit=20")
       * @param options - Optional configuration (currently ignored)
       * @returns Query string without the leading question mark
       */
      getQueryString(options?: Record<string, unknown>): string
      /**
       * Get the hostname with port (e.g., "api.example.com:8080")
       * @param forcePort - If true, includes standard ports (80/443)
       * @returns Hostname with port if non-standard or forced
       */
      getRemote(forcePort?: boolean): string
      /**
       * Update the entire URL from a string or object with toString()
       * @param url - New URL string or object with toString() method
       */
      update(url: string | { toString(): string }): void
      /**
       * Add multiple query parameters to the URL
       * @param params - Array of parameter objects with key/value pairs
       */
      addQueryParams(params: Array<{ key: string; value?: string }>): void
      /**
       * Remove query parameters by name
       * @param params - Single parameter name or array of names to remove
       */
      removeQueryParams(params: string | string[]): void

      query: {
        // Read methods
        /**
         * Get the value of a query parameter by key
         * @param key - Parameter key to retrieve
         * @returns Parameter value or null if not found
         */
        get(key: string): string | null
        /**
         * Check if a query parameter exists
         * @param key - Parameter key to check
         * @returns true if parameter exists, false otherwise
         */
        has(key: string): boolean
        /**
         * Get all query parameters as a key-value object
         * @returns Object with all query parameters
         */
        all(): Record<string, string>
        /**
         * Convert query parameters to object (alias for all())
         * @returns Object with all query parameters
         */
        toObject(): Record<string, string>
        /**
         * Get the number of query parameters
         * @returns Count of parameters
         */
        count(): number
        /**
         * Get a parameter by index
         * @param index - Zero-based index
         * @returns Parameter object or null if out of bounds
         */
        idx(index: number): { key: string; value: string } | null

        // Iteration methods
        /**
         * Iterate over all query parameters
         * @param callback - Function to call for each parameter
         */
        each(callback: (param: { key: string; value: string }) => void): void
        /**
         * Map query parameters to a new array
         * @param callback - Transform function
         * @returns Array of transformed values
         */
        map<T>(callback: (param: { key: string; value: string }) => T): T[]
        /**
         * Filter query parameters
         * @param callback - Predicate function
         * @returns Array of parameters matching the predicate
         */
        filter(
          callback: (param: { key: string; value: string }) => boolean
        ): Array<{ key: string; value: string }>
        /**
         * Find a query parameter by string key or function predicate
         * @param rule - String key or predicate function
         * @param context - Optional context to bind the predicate function
         * @returns Matching parameter or null if not found
         */
        find(
          rule: string | ((param: { key: string; value: string }) => boolean),
          context?: any
        ): { key: string; value: string } | null
        /**
         * Get the index of a query parameter
         * @param item - String key or parameter object to find
         * @returns Index of parameter, or -1 if not found
         */
        indexOf(item: string | { key: string; value: string }): number

        // Mutation methods
        /**
         * Add a new query parameter
         * @param param - Parameter to add
         */
        add(param: { key: string; value: string }): void
        /**
         * Remove a query parameter by key
         * @param key - Parameter key to remove
         */
        remove(key: string): void
        /**
         * Update an existing parameter or add a new one
         * @param param - Parameter to upsert
         */
        upsert(param: { key: string; value: string }): void
        /**
         * Remove all query parameters
         */
        clear(): void
        /**
         * Insert a query parameter before another parameter
         * @param item - Parameter to insert
         * @param before - String key or parameter object to insert before
         */
        insert(
          item: { key: string; value: string },
          before: string | { key: string; value: string }
        ): void
        /**
         * Move a parameter to the end or append a new one
         * @param item - Parameter to append
         */
        append(item: { key: string; value: string }): void
        /**
         * Merge parameters from an array or object
         * @param source - Array of parameters or key-value object
         * @param prune - If true, remove parameters not in source
         */
        assimilate(
          source:
            | Array<{ key: string; value: string }>
            | Record<string, string>,
          prune?: boolean
        ): void
      }
    }

    // Method - Mutable
    method: string

    // Headers - With Postman mutation methods
    headers: {
      // Read methods
      /**
       * Get the value of a header by name (case-insensitive)
       * @param name - Header name to retrieve
       * @returns Header value or null if not found
       */
      get(name: string): string | null
      /**
       * Check if a header exists (case-insensitive)
       * @param name - Header name to check
       * @returns true if header exists, false otherwise
       */
      has(name: string): boolean
      /**
       * Get all headers as a key-value object
       * @returns Object with all headers (keys in lowercase)
       */
      all(): Record<string, string>
      /**
       * Convert headers to object (alias for all())
       * @returns Object with all headers (keys in lowercase)
       */
      toObject(): Record<string, string>
      /**
       * Get the number of headers
       * @returns Count of headers
       */
      count(): number
      /**
       * Get a header by index
       * @param index - Zero-based index
       * @returns Header object or null if out of bounds
       */
      idx(index: number): { key: string; value: string } | null

      // Iteration methods
      /**
       * Iterate over all headers
       * @param callback - Function to call for each header
       */
      each(callback: (header: { key: string; value: string }) => void): void
      /**
       * Map headers to a new array
       * @param callback - Transform function
       * @returns Array of transformed values
       */
      map<T>(callback: (header: { key: string; value: string }) => T): T[]
      /**
       * Filter headers
       * @param callback - Predicate function
       * @returns Array of headers matching the predicate
       */
      filter(
        callback: (header: { key: string; value: string }) => boolean
      ): Array<{ key: string; value: string }>
      /**
       * Find a header by string key or function predicate (case-insensitive)
       * @param rule - String key or predicate function
       * @param context - Optional context to bind the predicate function
       * @returns Matching header or null if not found
       */
      find(
        rule: string | ((header: { key: string; value: string }) => boolean),
        context?: any
      ): { key: string; value: string } | null
      /**
       * Get the index of a header (case-insensitive)
       * @param item - String key or header object to find
       * @returns Index of header, or -1 if not found
       */
      indexOf(item: string | { key: string; value: string }): number

      // Mutation methods
      /**
       * Add a new header
       * @param header - Header to add
       */
      add(header: { key: string; value: string }): void
      /**
       * Remove a header by name (case-insensitive)
       * @param headerName - Header name to remove
       */
      remove(headerName: string): void
      /**
       * Update an existing header or add a new one
       * @param header - Header to upsert
       */
      upsert(header: { key: string; value: string }): void
      /**
       * Remove all headers
       */
      clear(): void
      /**
       * Insert a header before another header
       * @param item - Header to insert
       * @param before - String key or header object to insert before
       */
      insert(
        item: { key: string; value: string },
        before: string | { key: string; value: string }
      ): void
      /**
       * Move a header to the end or append a new one
       * @param item - Header to append
       */
      append(item: { key: string; value: string }): void
      /**
       * Merge headers from an array or object (case-insensitive)
       * @param source - Array of headers or key-value object
       * @param prune - If true, remove headers not in source
       */
      assimilate(
        source: Array<{ key: string; value: string }> | Record<string, string>,
        prune?: boolean
      ): void
    }

    // Body - With Postman update() method
    // Uses HoppRESTReqBody for type safety with Postman's update() extension
    body: HoppRESTReqBody & {
      update(
        body:
          | string
          | {
              mode?: "raw" | "urlencoded" | "formdata" | "file"
              raw?: string
              urlencoded?: Array<{ key: string; value: string }>
              formdata?: Array<{ key: string; value: string | File }>
              file?: File
              options?: {
                raw?: {
                  language?: "json" | "text" | "html" | "xml"
                }
              }
            }
      ): void
    }

    // Auth - Mutable with proper type safety
    auth: HoppRESTAuth
  }

  const info: Readonly<{
    readonly eventName: "pre-request"
    readonly requestName: string
    readonly requestId: string
    readonly iteration: never
    readonly iterationCount: never
  }>

  /**
   * Send an HTTP request (unsupported)
   * @throws Error - sendRequest is not supported in Hoppscotch
   */
  function sendRequest(
    request: string | { url: string; method?: string; [key: string]: any },
    callback?: (err: any, response: any) => void
  ): never

  /**
   * Collection variables (unsupported - Workspace feature)
   * Collection variables are not supported in Hoppscotch as they are a Postman Workspace feature
   */
  const collectionVariables: Readonly<{
    get(key: string): never
    set(key: string, value: string): never
    unset(key: string): never
    has(key: string): never
    clear(): never
    toObject(): never
    replaceIn(template: string): never
  }>

  /**
   * Postman Vault (unsupported)
   * Vault is not supported in Hoppscotch as it is a Postman-specific feature
   */
  const vault: Readonly<{
    get(key: string): never
    set(key: string, value: string): never
    unset(key: string): never
  }>

  /**
   * Iteration data (unsupported - Collection Runner feature)
   * Iteration data is not supported in Hoppscotch as it requires Collection Runner
   */
  const iterationData: Readonly<{
    get(key: string): never
    set(key: string, value: string): never
    unset(key: string): never
    has(key: string): never
    toObject(): never
    toJSON(): never
  }>

  /**
   * Visualizer API (unsupported)
   * The Postman Visualizer allows you to present response data as HTML templates with styling.
   * This feature is not supported in Hoppscotch as it requires a browser-based visualization UI.
   * @see https://learning.postman.com/docs/sending-requests/response-data/visualizer/
   */
  const visualizer: Readonly<{
    /**
     * Set a Handlebars template to visualize response data (unsupported)
     * @param layout - HTML template string with Handlebars syntax
     * @param data - Data object to pass to the template
     * @param options - Optional configuration object
     * @throws Error - Visualizer is not supported in Hoppscotch
     */
    set(
      layout: string,
      data?: Record<string, any>,
      options?: Record<string, any>
    ): never

    /**
     * Clear the current visualization (unsupported)
     * @throws Error - Visualizer is not supported in Hoppscotch
     */
    clear(): never
  }>

  /**
   * Execution control
   */
  const execution: Readonly<{
    /**
     * Execution location identifier
     * Always returns ["Hoppscotch"] with current = "Hoppscotch"
     */
    readonly location: readonly string[] & {
      readonly current: string
    }
    /**
     * Set next request to execute (unsupported - Collection Runner feature)
     * @param requestNameOrId - Name or ID of the next request
     */
    setNextRequest(requestNameOrId: string | null): never
    /**
     * Skip current request execution (unsupported - Collection Runner feature)
     */
    skipRequest(): never
    /**
     * Run a request (unsupported - Collection Runner feature)
     * @param requestNameOrId - Name or ID of the request to run
     */
    runRequest(requestNameOrId: string): never
  }>

  /**
   * Import packages from Package Library (unsupported)
   * @param packageName - Name of the package to import (e.g., '@team-domain/package-name' or 'npm:package-name@version')
   * @returns The imported package module
   * @throws Error - Package imports are not supported in Hoppscotch
   */
  function require(packageName: string): never
}
