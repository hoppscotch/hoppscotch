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
    setHeaders(headers: HoppRESTHeader[]): void
    removeHeader(key: string): void
    setParam(name: string, value: string): void
    setParams(params: HoppRESTParam[]): void
    removeParam(key: string): void
    /**
     * Set or update request body with automatic merging
     *
     * This method supports both partial updates and complete replacement:
     * - Partial updates: Merges provided fields with existing body configuration
     * - Complete replacement: When all fields are provided, replaces entire body
     *
     * @param body - Partial or complete HoppRESTReqBody object
     *
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
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
    has(key: string): boolean
    clear(): never
    toObject(): never
  }>

  const globals: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    unset(key: string): void
    has(key: string): boolean
    clear(): never
    toObject(): never
  }>

  const variables: Readonly<{
    get(key: string): string | null
    set(key: string, value: string): void
    has(key: string): boolean
    replaceIn(template: string): string
  }>

  const request: Readonly<{
    readonly url: { toString(): string }
    readonly method: string
    readonly headers: Readonly<{
      get(name: string): string | null
      has(name: string): boolean
      all(): HoppRESTHeader[]
    }>
    readonly body: any
    readonly auth: any
  }>

  const info: Readonly<{
    readonly eventName: "pre-request"
    readonly requestName: string
    readonly requestId: string
    readonly iteration: never
    readonly iterationCount: never
  }>

  const sendRequest: () => never
  const collectionVariables: Readonly<{
    get(): never
    set(): never
    unset(): never
    has(): never
    clear(): never
    toObject(): never
  }>
  const vault: Readonly<{
    get(): never
    set(): never
    unset(): never
  }>
  const iterationData: Readonly<{
    get(): never
    set(): never
    unset(): never
    has(): never
    toObject(): never
  }>
  const execution: Readonly<{
    setNextRequest(): never
  }>
}
