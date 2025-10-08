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

interface Expectation extends ExpectationMethods {
  not: BaseExpectation
}

interface BaseExpectation extends ExpectationMethods {}

interface ExpectationMethods {
  toBe(value: any): void
  toBeLevel2xx(): void
  toBeLevel3xx(): void
  toBeLevel4xx(): void
  toBeLevel5xx(): void
  toBeType(type: string): void
  toHaveLength(length: number): void
  toInclude(value: any): void
}

declare namespace pw {
  function test(name: string, func: () => void): void
  function expect(value: any): Expectation
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
    active: Readonly<{
      get(key: string): string | null
      getRaw(key: string): string | null
      getInitialRaw(key: string): string | null
    }>
    global: Readonly<{
      get(key: string): string | null
      getRaw(key: string): string | null
      getInitialRaw(key: string): string | null
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
      asJSON(): Record<string, any>
      bytes(): Uint8Array
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

  function test(name: string, testFunction: () => void): void
  function expect(value: any): Expectation

  const info: Readonly<{
    readonly eventName: "post-request"
    readonly requestName: string
    readonly requestId: string
    readonly iteration: never
    readonly iterationCount: never
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
      all(): Record<string, string>
    }>
    readonly body: HoppRESTReqBody
    readonly auth: HoppRESTAuth
  }>

  const response: Readonly<{
    readonly code: number
    readonly status: string
    readonly responseTime: number
    text(): string
    json(): Record<string, any>
    stream: Uint8Array
    headers: Readonly<{
      get(name: string): string | null
      has(name: string): boolean
      all(): HoppRESTResponseHeader[]
    }>
    cookies: Readonly<{
      get(name: string): any
      has(name: string): any
      toObject(): any
    }>
  }>

  const cookies: Readonly<{
    get(name: string): any
    set(name: string, value: string, options?: any): any
    jar(): any
  }>

  function test(name: string, testFunction: () => void): void
  function expect(value: any): Expectation

  const info: Readonly<{
    readonly eventName: "post-request"
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
