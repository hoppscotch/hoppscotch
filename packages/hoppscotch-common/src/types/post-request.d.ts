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

interface HoppRESTResponseHeader {
  key: string
  value: string
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

interface HoppRESTAuthOAuth2 {
  authType: "oauth-2"
  authActive: boolean
  grantTypeInfo: OAuth2GrantTypeInfo
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

// Length property that can be used both as property and callable with comparison methods
// Matches actual runtime implementation in post-request.js lines 371-414
interface ChaiLengthAssertion {
  // Primary comparison methods (actually implemented in runtime)
  above(n: number): ChaiExpectation
  below(n: number): ChaiExpectation
  within(min: number, max: number): ChaiExpectation
  least(n: number): ChaiExpectation
  most(n: number): ChaiExpectation
  gte(n: number): ChaiExpectation
  lte(n: number): ChaiExpectation

  // Aliases implemented in runtime (for compatibility)
  greaterThan(n: number): ChaiExpectation // Alias for above()
  lessThan(n: number): ChaiExpectation // Alias for below()

  // Postman-style .at.least() and .at.most() support
  at: Readonly<{
    least(n: number): ChaiExpectation
    most(n: number): ChaiExpectation
  }>
}

// Chai-powered assertion interface
interface ChaiExpectation {
  // Negation
  not: ChaiExpectation

  // Language chains (improve readability without affecting assertions)
  to: ChaiExpectation
  be: ChaiExpectation
  been: ChaiExpectation
  is: ChaiExpectation
  that: ChaiExpectation
  which: ChaiExpectation
  and: ChaiExpectation
  has: ChaiExpectation
  have: ChaiExpectation
  with: ChaiExpectation
  at: ChaiExpectation
  of: ChaiExpectation
  same: ChaiExpectation
  but: ChaiExpectation
  does: ChaiExpectation
  still: ChaiExpectation
  also: ChaiExpectation

  // Modifiers (can be used as both properties and methods)
  deep: ChaiExpectation
  nested: ChaiExpectation
  own: ChaiExpectation
  ordered: ChaiExpectation
  any: ChaiExpectation
  all: ChaiExpectation

  // Include/contain can be used as both properties AND methods
  include: ChaiExpectation & ((value: any) => ChaiExpectation)
  contain: ChaiExpectation & ((value: any) => ChaiExpectation)
  includes: ChaiExpectation & ((value: any) => ChaiExpectation)
  contains: ChaiExpectation & ((value: any) => ChaiExpectation)

  // Type assertions - can be used as both property and method
  a: ChaiExpectation & ((type: string) => ChaiExpectation)
  an: ChaiExpectation & ((type: string) => ChaiExpectation)

  // Equality assertions
  equal(value: any): ChaiExpectation
  equals(value: any): ChaiExpectation
  eq(value: any): ChaiExpectation
  eql(value: any): ChaiExpectation

  // Truthiness assertions
  true: ChaiExpectation
  false: ChaiExpectation
  ok: ChaiExpectation
  null: ChaiExpectation
  undefined: ChaiExpectation
  NaN: ChaiExpectation
  exist: ChaiExpectation
  empty: ChaiExpectation
  arguments: ChaiExpectation

  // Numerical comparison assertions
  above(n: number): ChaiExpectation
  gt(n: number): ChaiExpectation
  greaterThan(n: number): ChaiExpectation
  below(n: number): ChaiExpectation
  lt(n: number): ChaiExpectation
  lessThan(n: number): ChaiExpectation
  least(n: number): ChaiExpectation
  gte(n: number): ChaiExpectation
  greaterThanOrEqual(n: number): ChaiExpectation
  most(n: number): ChaiExpectation
  lte(n: number): ChaiExpectation
  lessThanOrEqual(n: number): ChaiExpectation
  within(start: number, finish: number): ChaiExpectation
  closeTo(expected: number, delta: number): ChaiExpectation
  approximately(expected: number, delta: number): ChaiExpectation

  // Property assertions
  property(name: string, value?: any): ChaiExpectation
  ownProperty(name: string, value?: any): ChaiExpectation
  haveOwnProperty(name: string, value?: any): ChaiExpectation
  ownPropertyDescriptor(
    name: string,
    descriptor?: PropertyDescriptor
  ): ChaiExpectation

  // Length assertions - SPECIAL: Can be used as property or called with comparison methods
  // Allow .length to be called as function or used as property with comparison methods
  length: ChaiLengthAssertion & number & ((n: number) => ChaiExpectation)
  lengthOf: ((n: number) => ChaiExpectation) & ChaiLengthAssertion

  // String/Array inclusion assertions
  string(str: string): ChaiExpectation
  match(regex: RegExp): ChaiExpectation
  matches(regex: RegExp): ChaiExpectation
  members(set: any[]): ChaiExpectation
  oneOf(list: any[]): ChaiExpectation

  // Key assertions
  keys(...keys: string[] | [string[]]): ChaiExpectation
  key(key: string | string[]): ChaiExpectation

  // Function/Error assertions
  throw(
    errorLike?: any,
    errMsgMatcher?: string | RegExp,
    message?: string
  ): ChaiExpectation
  throws(
    errorLike?: any,
    errMsgMatcher?: string | RegExp,
    message?: string
  ): ChaiExpectation
  Throw(
    errorLike?: any,
    errMsgMatcher?: string | RegExp,
    message?: string
  ): ChaiExpectation
  respondTo(method: string): ChaiExpectation
  respondsTo(method: string): ChaiExpectation
  itself: ChaiExpectation
  satisfy(matcher: (value: any) => boolean): ChaiExpectation
  satisfies(matcher: (value: any) => boolean): ChaiExpectation

  // Object state assertions
  sealed: ChaiExpectation
  frozen: ChaiExpectation
  extensible: ChaiExpectation
  finite: ChaiExpectation

  // instanceof assertion
  instanceof(constructor: any): ChaiExpectation
  instanceOf(constructor: any): ChaiExpectation

  // Side-effect assertions
  // Side effect assertions - support both getter function and object+property patterns
  change(
    getter: () => any
  ): ChaiExpectation & { by(delta: number): ChaiExpectation }
  change(
    obj: any,
    prop: string
  ): ChaiExpectation & { by(delta: number): ChaiExpectation }
  increase(
    getter: () => any
  ): ChaiExpectation & { by(delta: number): ChaiExpectation }
  increase(
    obj: any,
    prop: string
  ): ChaiExpectation & { by(delta: number): ChaiExpectation }
  decrease(
    getter: () => any
  ): ChaiExpectation & { by(delta: number): ChaiExpectation }
  decrease(
    obj: any,
    prop: string
  ): ChaiExpectation & { by(delta: number): ChaiExpectation }

  // Postman custom Chai assertions (available via pm.expect())
  /**
   * Assert that value matches JSON Schema
   * @param schema - JSON Schema object
   */
  jsonSchema(schema: {
    type?: string
    required?: string[]
    properties?: Record<string, any>
    items?: any
    enum?: any[]
    minimum?: number
    maximum?: number
    minLength?: number
    maxLength?: number
    pattern?: string
    minItems?: number
    maxItems?: number
  }): ChaiExpectation

  /**
   * Assert that string value contains specific charset/encoding
   * @param expectedCharset - Expected charset (e.g., 'utf-8', 'iso-8859-1')
   */
  charset(expectedCharset: string): ChaiExpectation

  /**
   * Assert that cookie exists and optionally has specific value
   * @param cookieName - Name of the cookie
   * @param cookieValue - Optional expected value
   */
  cookie(cookieName: string, cookieValue?: string): ChaiExpectation

  /**
   * Assert that JSON path exists and optionally has specific value
   * @param path - JSONPath expression (e.g., '$.users[0].name')
   * @param expectedValue - Optional expected value at path
   */
  jsonPath(path: string, expectedValue?: any): ChaiExpectation

  // Legacy methods (kept for backward compatibility)
  toBe(value: any): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(type: string): void
  toHaveLength(length: number): void
  toInclude(value: any): void
}

// Legacy expectation interface for pw namespace (backward compatibility only)
interface LegacyExpectation extends LegacyExpectationMethods {
  not: LegacyBaseExpectation
}

interface LegacyBaseExpectation extends LegacyExpectationMethods {}

interface LegacyExpectationMethods {
  toBe(value: any): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(type: string): void
  toHaveLength(length: number): void
  toInclude(value: any): void
}

// Backward compatibility types for hopp and pm namespaces
interface Expectation extends ChaiExpectation {}
interface BaseExpectation extends ChaiExpectation {}
interface ExpectationMethods extends ChaiExpectation {}

declare namespace pw {
  function test(name: string, func: () => void): void
  function expect(value: any): LegacyExpectation
  const response: Readonly<{
    status: number
    body: any
    headers: HoppRESTResponseHeader[]
  }>
  namespace env {
    function set(key: string, value: string): void
    function unset(key: string): void
    function get(key: string): string
    function getResolve(key: string): string
    function resolve(value: string): string
  }
}

declare namespace hopp {
  const env: Readonly<{
    get(key: string): string | null
    getRaw(key: string): string | null
    getInitialRaw(key: string): string | null
    set(key: string, value: string): void
    delete(key: string): void
    reset(key: string): void
    setInitial(key: string, value: string): void
    active: Readonly<{
      get(key: string): string | null
      getRaw(key: string): string | null
      getInitialRaw(key: string): string | null
      set(key: string, value: string): void
      delete(key: string): void
      reset(key: string): void
      setInitial(key: string, value: string): void
    }>
    global: Readonly<{
      get(key: string): string | null
      getRaw(key: string): string | null
      getInitialRaw(key: string): string | null
      set(key: string, value: string): void
      delete(key: string): void
      reset(key: string): void
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
    variables: Readonly<{
      get(key: string): string | null
    }>
  }>

  const response: Readonly<{
    readonly statusCode: number
    readonly statusText: string
    readonly headers: HoppRESTResponseHeader[]
    readonly responseTime: number
    body: Readonly<{
      asText(): string
      asJSON(): any
      bytes(): Uint8Array
    }>
    /**
     * Get response body as text string
     * @returns Response body as string
     */
    text(): string
    /**
     * Get response body as parsed JSON
     * @returns Parsed JSON object
     */
    json(): any
    /**
     * Get HTTP reason phrase (status text)
     * @returns HTTP reason phrase (e.g., "OK", "Not Found")
     */
    reason(): string
    /**
     * Convert response to data URI format
     * @returns Data URI string with base64 encoded content
     */
    dataURI(): string
    /**
     * Parse JSONP response
     * @param callbackName - Optional callback function name (default: "callback")
     * @returns Parsed JSON object from JSONP wrapper
     */
    jsonp(callbackName?: string): any
  }>

  const cookies: Readonly<{
    get(domain: string, name: string): Cookie | null
    set(domain: string, cookie: Cookie): void
    has(domain: string, name: string): boolean
    getAll(domain: string): Cookie[]
    delete(domain: string, name: string): void
    clear(domain: string): void
  }>

  function test(name: string, testFunction: () => void): void

  interface HoppExpectFunction {
    (value: any): ChaiExpectation
    /**
     * Fail the test with a custom message
     * @param message - Optional message to display on failure
     */
    fail(message?: string): never
  }

  const expect: HoppExpectFunction

  const info: Readonly<{
    readonly eventName: "post-request"
    readonly requestName: string
    readonly requestId: string
    readonly iteration: never
    readonly iterationCount: never
  }>

  /**
   * Fetch API - Makes HTTP requests respecting interceptor settings
   * @param input - URL string or Request object
   * @param init - Optional request options
   * @returns Promise that resolves to Response object
   */
  function fetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response>
}

/**
 * Global fetch function - alias to hopp.fetch()
 * Makes HTTP requests respecting interceptor settings
 * @param input - URL string or Request object
 * @param init - Optional request options
 * @returns Promise that resolves to Response object
 */
declare function fetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response>

declare namespace pm {
  const environment: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
    has(key: string): boolean
    clear(): void
    toObject(): Record<string, string>
  }>

  const globals: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
    has(key: string): boolean
    clear(): void
    toObject(): Record<string, string>
  }>

  const collectionVariables: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
    has(key: string): boolean
    clear(): void
    toObject(): Record<string, string>
  }>

  const variables: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
    has(key: string): boolean
    toObject(): Record<string, string>
  }>

  const iterationData: Readonly<{
    get(key: string): any
    toObject(): Record<string, any>
  }>

  const request: Readonly<{
    url: Readonly<{
      toString(): string
      protocol: string | null
      port: string | null
      path: string[]
      host: string[]
      query: Readonly<{
        has(key: string): boolean
        get(key: string): string | null
        toObject(): Record<string, string>
      }>
      variables: Readonly<{
        has(key: string): boolean
        get(key: string): string | null
        toObject(): Record<string, string>
      }>
      hash: string | null
      update(url: string): void
      addQueryParams(params: string | Array<{ key: string; value: string }>): void
      removeQueryParams(params: string | string[]): void
    }>
    headers: Readonly<{
      has(key: string): boolean
      get(key: string): string | null
      toObject(): Record<string, string>
      add(header: { key: string; value: string }): void
      remove(key: string): void
      upsert(header: { key: string; value: string }): void
    }>
    method: string
    body: Readonly<{
      mode: string
      raw: string | null
      urlencoded: Array<{ key: string; value: string }> | null
      formdata: Array<{ key: string; value: string }> | null
      file: any | null
      graphql: any | null
      toObject(): any
      update(body: any): void
    }>
    auth: any
    certificate: any
    proxy: any
  }>

  const response: Readonly<{
    code: number
    status: string
    headers: Readonly<{
      has(key: string): boolean
      get(key: string): string | null
      toObject(): Record<string, string>
    }>
    cookies: Readonly<{
      has(name: string): boolean
      get(name: string): Cookie | null
      toObject(): Record<string, Cookie>
    }>
    body: string
    json(): any
    text(): string
    reason(): string
    responseTime: number
    responseSize: number
    dataURI(): string
  }>

  const cookies: Readonly<{
    has(name: string): boolean
    get(name: string): Cookie | null
    set(name: string, value: string, options?: any): void
    jar(): any
  }>

  function test(name: string, fn: () => void): void

  interface PmExpectFunction {
    (value: any, message?: string): ChaiExpectation
    fail?: (...args: any[]) => never
  }

  const expect: PmExpectFunction

  const info: Readonly<{
    eventName: string
    iteration: number
    iterationCount: number
    requestName: string
    requestId: string
  }>

  interface SendRequestCallback {
    (error: Error | null, response: {
      code: number
      status: string
      headers: {
        has(key: string): boolean
        get(key: string): string | null
      }
      body: string
      responseTime: number
      responseSize: number
      text(): string
      json(): any
      cookies: {
        has(name: string): boolean
        get(name: string): any | null
      }
    } | null): void
  }

  function sendRequest(
    urlOrRequest: string | {
      url: string
      method?: string
      header?: Record<string, string> | Array<{ key: string; value: string }>
      body?: {
        mode: 'raw' | 'urlencoded' | 'formdata'
        raw?: string
        urlencoded?: Array<{ key: string; value: string }>
        formdata?: Array<{ key: string; value: string }>
      }
    },
    callback: SendRequestCallback
  ): void

  const vault: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
  }>

  const visualizer: Readonly<{
    set(template: string, data?: any): void
    clear(): void
  }>
}
  const environment: Readonly<{
    readonly name: string
    get(key: string): any
    set(key: string, value: any): void
    unset(key: string): void
    has(key: string): boolean
    clear(): void
    toObject(): Record<string, string>
    replaceIn(template: string): string
  }>

  const globals: Readonly<{
    get(key: string): any
    /**
     * Set a global variable
     * @param key - Variable key
     * @param value - Variable value (undefined is preserved, other types are coerced to strings)
     */
    set(key: string, value: any): void
    unset(key: string): void
    has(key: string): boolean
    clear(): void
    toObject(): Record<string, string>
    replaceIn(template: string): string
  }>

  const variables: Readonly<{
    get(key: string): any
    /**
     * Set a variable in the active environment scope
     * @param key - Variable key
     * @param value - Variable value (undefined is preserved, other types are coerced to strings)
     */
    set(key: string, value: any): void
    has(key: string): boolean
    replaceIn(template: string): string
    toObject(): Record<string, string>
  }>

  const request: Readonly<{
    readonly id: string
    readonly name: string
    readonly url: Readonly<{
      toString(): string
      readonly protocol: string
      readonly host: string[]
      readonly port: string
      readonly path: string[]
      readonly hash: string

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

      readonly query: Readonly<{
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
      }>
    }>

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

    readonly method: string
    readonly headers: Readonly<{
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
       * @returns Object with all headers
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
       * Find a header by string name or function predicate (case-insensitive)
       * @param rule - String name or predicate function
       * @param context - Optional context to bind the predicate function
       * @returns Matching header or null if not found
       */
      find(
        rule: string | ((header: { key: string; value: string }) => boolean),
        context?: any
      ): { key: string; value: string } | null
      /**
       * Get the index of a header (case-insensitive)
       * @param item - String name or header object to find
       * @returns Index of header, or -1 if not found
       */
      indexOf(item: string | { key: string; value: string }): number
    }>
    readonly body: HoppRESTReqBody
    readonly auth: HoppRESTAuth
  }>

  const response: Readonly<{
    readonly code: number
    readonly status: string
    readonly responseTime: number
    readonly responseSize: number
    text(): string
    json(): any
    stream: Uint8Array
    /**
     * Get HTTP reason phrase (status text)
     * @returns HTTP reason phrase (e.g., "OK", "Not Found")
     */
    reason(): string
    /**
     * Convert response to data URI format
     * @returns Data URI string with base64 encoded content
     */
    dataURI(): string
    /**
     * Parse JSONP response
     * @param callbackName - Optional callback function name (default: "callback")
     * @returns Parsed JSON object from JSONP wrapper
     */
    jsonp(callbackName?: string): any
    headers: Readonly<{
      get(name: string): string | null
      has(name: string): boolean
      all(): HoppRESTResponseHeader[]
    }>
    cookies: Readonly<{
      get(name: string): string | null
      has(name: string): boolean
      toObject(): Record<string, string>
    }>
    to: Readonly<{
      have: Readonly<{
        status(expectedCode: number): void
        header(headerName: string, headerValue?: string): void
        body(expectedBody: string): void
        jsonBody(): void
        jsonBody(key: string): void
        jsonBody(key: string, expectedValue: any): void
        jsonBody(schema: object): void
        responseTime: Readonly<{
          below(ms: number): void
          above(ms: number): void
        }>
        jsonSchema(schema: {
          type?: string
          required?: string[]
          properties?: Record<string, any>
          items?: any
          enum?: any[]
          minimum?: number
          maximum?: number
          minLength?: number
          maxLength?: number
          pattern?: string
          minItems?: number
          maxItems?: number
        }): void
        charset(expectedCharset: string): void
        cookie(cookieName: string, cookieValue?: string): void
        jsonPath(path: string, expectedValue?: any): void
      }>
      be: Readonly<{
        ok(): void
        success(): void
        accepted(): void
        badRequest(): void
        unauthorized(): void
        forbidden(): void
        notFound(): void
        rateLimited(): void
        serverError(): void
        clientError(): void
        json(): void
        html(): void
        xml(): void
        text(): void
      }>
    }>
  }>

  const cookies: Readonly<{
    get(name: string): any
    set(name: string, value: string, options?: any): any
    jar(): never
  }>

  function test(name: string, testFunction: () => void): void

  interface ExpectFunction {
    (value: any): ChaiExpectation
    /**
     * Fail the test with a custom message
     * @param message - Optional message to display on failure
     */
    fail(message?: string): never
  }

  const expect: ExpectFunction

  const info: Readonly<{
    readonly eventName: "post-request"
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
