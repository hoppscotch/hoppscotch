import { getService } from "~/modules/dioc"

import { TeamOAuthTokenService } from "~/services/team-oauth-token.service"

/**
 * OAuth access/refresh tokens on team collections and requests are personal.
 * The shared team document keeps the OAuth configuration (endpoints, client
 * id, scopes, grant type) but not the token. Each member's token lives in
 * `TeamOAuthTokenService` (#5949).
 */
export type OAuthTokenRecord = {
  token: string
  refreshToken?: string
}

export const teamRequestTokenKey = (requestId: string) => `request:${requestId}`

export const teamCollectionTokenKey = (collectionId: string) =>
  `collection:${collectionId}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isOAuth2Auth = (
  value: unknown
): value is { authType: "oauth-2"; grantTypeInfo: Record<string, unknown> } =>
  isRecord(value) &&
  value.authType === "oauth-2" &&
  isRecord(value.grantTypeInfo)

/**
 * Read a personal token off an auth object. Empty tokens are `null` so a
 * cleared field can drop the local record.
 */
export const readOAuthTokenRecord = (
  auth: unknown
): OAuthTokenRecord | null => {
  if (!isOAuth2Auth(auth)) return null

  const token =
    typeof auth.grantTypeInfo.token === "string" ? auth.grantTypeInfo.token : ""
  const refreshToken =
    typeof auth.grantTypeInfo.refreshToken === "string"
      ? auth.grantTypeInfo.refreshToken
      : undefined

  if (!token && !refreshToken) return null

  return refreshToken !== undefined ? { token, refreshToken } : { token }
}

/**
 * Copy `value` with every OAuth token blanked. Objects that contain no OAuth
 * auth are returned unchanged, so callers can use this on personal data
 * without rewriting it.
 */
export const stripOAuthTokensDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const stripped = stripOAuthTokensDeep(item)
      if (stripped !== item) changed = true
      return stripped
    })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  if (isOAuth2Auth(value)) {
    const info = value.grantTypeInfo
    const token = typeof info.token === "string" ? info.token : ""
    const hasRefresh = "refreshToken" in info
    const refresh =
      typeof info.refreshToken === "string" ? info.refreshToken : ""
    if (token === "" && (!hasRefresh || refresh === "")) return value

    return {
      ...value,
      grantTypeInfo: {
        ...info,
        token: "",
        ...(hasRefresh ? { refreshToken: "" } : {}),
      },
    } as T
  }

  let changed = false
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const stripped = stripOAuthTokensDeep(child)
    if (stripped !== child) changed = true
    next[key] = stripped
  }

  return (changed ? next : value) as T
}

export const applyOAuthTokenRecord = <T>(
  auth: T,
  record: OAuthTokenRecord | null | undefined
): T => {
  if (!record || !isOAuth2Auth(auth)) return auth
  if (!record.token && !record.refreshToken) return auth

  const info: Record<string, unknown> = {
    ...auth.grantTypeInfo,
    token: record.token,
  }

  if (
    record.refreshToken !== undefined &&
    auth.grantTypeInfo.grantType !== "IMPLICIT"
  ) {
    info.refreshToken = record.refreshToken
  }

  return {
    ...auth,
    grantTypeInfo: info,
  } as T
}

const syncStoredTokens = (storageKey: string, auth: unknown) => {
  const service = getService(TeamOAuthTokenService)

  if (!isOAuth2Auth(auth)) {
    service.forget(storageKey)
    return
  }

  const captured = readOAuthTokenRecord(auth)
  if (captured) service.remember(storageKey, captured)
  else service.forget(storageKey)
}

/**
 * Drop shared OAuth tokens from a team request payload and keep the caller's
 * own token locally under `requestId`.
 *
 * Server copies are not trusted: a payload that still carries a historical
 * token is blanked before the local record is applied.
 */
export const hydrateTeamRequest = <T>(requestId: string, request: T): T => {
  const stripped = stripOAuthTokensDeep(request)
  if (!requestId || !isRecord(stripped) || !("auth" in stripped))
    return stripped

  const record = getService(TeamOAuthTokenService).recall(
    teamRequestTokenKey(requestId)
  )
  if (!record) return stripped

  return {
    ...stripped,
    auth: applyOAuthTokenRecord(stripped.auth, record),
  } as T
}

export const hydrateCollectionAuth = <T>(collectionId: string, auth: T): T => {
  const stripped = stripOAuthTokensDeep(auth)
  if (!collectionId) return stripped

  const record = getService(TeamOAuthTokenService).recall(
    teamCollectionTokenKey(collectionId)
  )
  return applyOAuthTokenRecord(stripped, record)
}

/**
 * Prepare a team request JSON body for the backend. Stores the caller's
 * token locally and returns JSON with every OAuth token blanked.
 */
export const redactRequestJsonForTeamWire = (
  requestId: string,
  requestJson: string
): string => {
  let parsed: unknown
  try {
    parsed = JSON.parse(requestJson)
  } catch {
    return requestJson
  }

  if (isRecord(parsed) && "auth" in parsed) {
    syncStoredTokens(teamRequestTokenKey(requestId), parsed.auth)
  }

  const stripped = stripOAuthTokensDeep(parsed)
  return stripped === parsed ? requestJson : JSON.stringify(stripped)
}

/**
 * Split a create payload: the wire body has no tokens, and `captured` is the
 * caller's token to store once the backend assigns an id.
 */
export const splitRequestForTeamCreate = (
  requestJson: string
): { wireJson: string; captured: OAuthTokenRecord | null } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(requestJson)
  } catch {
    return { wireJson: requestJson, captured: null }
  }

  const captured = isRecord(parsed) ? readOAuthTokenRecord(parsed.auth) : null
  const stripped = stripOAuthTokensDeep(parsed)

  return {
    wireJson: stripped === parsed ? requestJson : JSON.stringify(stripped),
    captured,
  }
}

export const redactCollectionDataForTeamWire = <T>(
  collectionId: string,
  data: T
): T => {
  if (isRecord(data) && "auth" in data) {
    syncStoredTokens(teamCollectionTokenKey(collectionId), data.auth)
  }

  return stripOAuthTokensDeep(data)
}

export const stripOAuthTokensFromJsonString = (json: string): string => {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return json
  }

  const stripped = stripOAuthTokensDeep(parsed)
  return stripped === parsed ? json : JSON.stringify(stripped)
}
