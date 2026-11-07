import { generateUniqueRefId } from "@hoppscotch/data"

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

const REQUEST_TOKEN_KEY_PREFIX = "request:"

export const teamRequestTokenKey = (requestId: string) =>
  `${REQUEST_TOKEN_KEY_PREFIX}${requestId}`

export const teamCollectionTokenKey = (collectionId: string) =>
  `collection:${collectionId}`

/** Token captured from an import, claimed once the backend assigns an id. */
export const teamRequestImportKey = (refId: string) => `request-import:${refId}`

export const teamCollectionImportKey = (refId: string) =>
  `collection-import:${refId}`

export type TokenSyncPlan =
  | { type: "keep"; key: string; record: OAuthTokenRecord }
  | { type: "drop"; key: string }
  | { type: "noop" }

export type PendingOAuthToken = {
  key: string
  record: OAuthTokenRecord
}

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

const planAuthTokenSync = (key: string, auth: unknown): TokenSyncPlan => {
  if (!isOAuth2Auth(auth)) return { type: "drop", key }

  const captured = readOAuthTokenRecord(auth)
  if (captured) return { type: "keep", key, record: captured }
  return { type: "drop", key }
}

/**
 * Apply a planned remember/forget. Call this only after the team save that
 * produced `plan` has succeeded, so a rejected update cannot clear the token
 * the shared request still has.
 *
 * A request-token plan also bumps `TeamOAuthTokenService.revision`. The
 * collection tree copies a token in when `teamRequestUpdated` arrives, and
 * that event can run before this commit, so the cached request still has the
 * previous token (or none) until the tree is hydrated again.
 */
export const commitTokenSyncPlan = (plan: TokenSyncPlan) => {
  if (plan.type === "noop") return

  const service = getService(TeamOAuthTokenService)
  if (plan.type === "keep") {
    service.remember(plan.key, plan.record)
  } else {
    service.forget(plan.key)
  }

  // Collection tokens are read when the collection is opened, and import
  // keys are claimed later. Only request snapshots live on the tree.
  if (plan.key.startsWith(REQUEST_TOKEN_KEY_PREFIX)) {
    service.revision.value++
  }
}

const adoptImportedToken = (storageKey: string, importKey: string) => {
  const service = getService(TeamOAuthTokenService)
  const pending = service.recall(importKey)
  if (!pending) return

  if (!service.recall(storageKey)) {
    service.remember(storageKey, pending)
  }
  service.forget(importKey)
}

/** Move a collection token captured at import onto the backend collection id. */
export const adoptImportedCollectionToken = (
  collectionId: string,
  refId: string
) => {
  if (!collectionId || !refId) return
  adoptImportedToken(
    teamCollectionTokenKey(collectionId),
    teamCollectionImportKey(refId)
  )
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

  if (typeof stripped._ref_id === "string") {
    adoptImportedToken(
      teamRequestTokenKey(requestId),
      teamRequestImportKey(stripped._ref_id)
    )
  }

  const record = getService(TeamOAuthTokenService).recall(
    teamRequestTokenKey(requestId)
  )
  if (!record) return stripped

  return {
    ...stripped,
    auth: applyOAuthTokenRecord(stripped.auth, record),
  } as T
}

export const hydrateCollectionAuth = <T>(
  collectionId: string,
  auth: T,
  refId?: string | null
): T => {
  const stripped = stripOAuthTokensDeep(auth)
  if (!collectionId) return stripped

  if (refId) adoptImportedCollectionToken(collectionId, refId)

  const record = getService(TeamOAuthTokenService).recall(
    teamCollectionTokenKey(collectionId)
  )
  return applyOAuthTokenRecord(stripped, record)
}

type OAuthTokenTreeNode = {
  requests: { id: string; request: unknown }[] | null
  children: OAuthTokenTreeNode[] | null
}

/**
 * Re-apply the active member's tokens onto requests already stored in the
 * team collection tree. Hydration snapshots credentials, so a load or account
 * switch that finishes afterwards has to refresh those requests.
 */
export const rehydrateTeamCollectionOAuthTokens = (
  collections: OAuthTokenTreeNode[]
) => {
  const walk = (nodes: OAuthTokenTreeNode[]) => {
    for (const node of nodes) {
      node.requests?.forEach((request) => {
        request.request = hydrateTeamRequest(request.id, request.request)
      })
      if (node.children?.length) walk(node.children)
    }
  }

  walk(collections)
}

/**
 * Split a team request update into the wire body and the local token change.
 * The store is not touched until `commitTokenSyncPlan`.
 */
export const separateRequestForTeamUpdate = (
  requestId: string,
  requestJson: string
): { wireJson: string; plan: TokenSyncPlan } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(requestJson)
  } catch {
    return { wireJson: requestJson, plan: { type: "noop" } }
  }

  const plan =
    isRecord(parsed) && "auth" in parsed
      ? planAuthTokenSync(teamRequestTokenKey(requestId), parsed.auth)
      : { type: "noop" as const }

  const stripped = stripOAuthTokensDeep(parsed)
  return {
    wireJson: stripped === parsed ? requestJson : JSON.stringify(stripped),
    plan,
  }
}

/**
 * Prepare a team request JSON body for the backend. Returns JSON with every
 * OAuth token blanked. Does not write the local token store; commit
 * `separateRequestForTeamUpdate(...).plan` after the save succeeds.
 */
export const redactRequestJsonForTeamWire = (
  requestId: string,
  requestJson: string
): string => separateRequestForTeamUpdate(requestId, requestJson).wireJson

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

/**
 * Split a team collection update into the wire body and the local token
 * change. The store is not touched until `commitTokenSyncPlan`.
 */
export const separateCollectionForTeamUpdate = <T>(
  collectionId: string,
  data: T
): { wire: T; plan: TokenSyncPlan } => {
  const plan =
    isRecord(data) && "auth" in data
      ? planAuthTokenSync(teamCollectionTokenKey(collectionId), data.auth)
      : { type: "noop" as const }

  return {
    wire: stripOAuthTokensDeep(data),
    plan,
  }
}

export const redactCollectionDataForTeamWire = <T>(
  collectionId: string,
  data: T
): T => separateCollectionForTeamUpdate(collectionId, data).wire

const ensureRefId = (
  value: Record<string, unknown>,
  prefix: "req" | "coll"
) => {
  if (typeof value._ref_id === "string" && value._ref_id) return value._ref_id
  const refId = generateUniqueRefId(prefix)
  value._ref_id = refId
  return refId
}

/**
 * Blank OAuth tokens inside a collection `data` payload. `data` is a JSON
 * string on the import wire, so a plain object walk would leave it untouched.
 */
const redactCollectionDataValue = (
  data: unknown,
  pending: PendingOAuthToken[]
): { value: unknown; changed: boolean } => {
  if (typeof data === "string") {
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return { value: data, changed: false }
    }

    if (typeof parsed === "string") {
      const inner = redactCollectionDataValue(parsed, pending)
      if (!inner.changed) return { value: data, changed: false }
      return { value: JSON.stringify(inner.value), changed: true }
    }

    const redacted = redactCollectionDataValue(parsed, pending)
    if (!redacted.changed) return { value: data, changed: false }
    return { value: JSON.stringify(redacted.value), changed: true }
  }

  if (!isRecord(data)) return { value: data, changed: false }

  const captured = readOAuthTokenRecord(data.auth)
  if (captured) {
    const refId = ensureRefId(data, "coll")
    pending.push({ key: teamCollectionImportKey(refId), record: captured })
  }

  const stripped = stripOAuthTokensDeep(data)
  return { value: stripped, changed: stripped !== data || captured !== null }
}

const redactImportedRequest = (
  request: unknown,
  pending: PendingOAuthToken[]
): { value: unknown; changed: boolean } => {
  if (typeof request === "string") {
    let parsed: unknown
    try {
      parsed = JSON.parse(request)
    } catch {
      return { value: request, changed: false }
    }

    const redacted = redactImportedRequest(parsed, pending)
    if (!redacted.changed) return { value: request, changed: false }
    return { value: JSON.stringify(redacted.value), changed: true }
  }

  if (!isRecord(request)) return { value: request, changed: false }

  const captured = readOAuthTokenRecord(request.auth)
  if (captured) {
    const refId = ensureRefId(request, "req")
    pending.push({ key: teamRequestImportKey(refId), record: captured })
  }

  const stripped = stripOAuthTokensDeep(request)
  return {
    value: stripped,
    changed: stripped !== request || captured !== null,
  }
}

const redactImportedFolder = (
  folder: Record<string, unknown>,
  pending: PendingOAuthToken[]
): boolean => {
  let changed = false

  if ("data" in folder) {
    const redacted = redactCollectionDataValue(folder.data, pending)
    if (redacted.changed) {
      folder.data = redacted.value
      changed = true
    }
  }

  if (Array.isArray(folder.requests)) {
    let requestsChanged = false
    const requests = folder.requests.map((request) => {
      const redacted = redactImportedRequest(request, pending)
      if (redacted.changed) requestsChanged = true
      return redacted.value
    })
    if (requestsChanged) {
      folder.requests = requests
      changed = true
    }
  }

  if (Array.isArray(folder.folders)) {
    for (const child of folder.folders) {
      if (isRecord(child) && redactImportedFolder(child, pending)) {
        changed = true
      }
    }
  }

  return changed
}

/**
 * Blank OAuth tokens in a team import document, including collection auth
 * stored as a JSON string on `data`, and return the caller's tokens so they
 * can be kept locally under each `_ref_id`.
 */
export const prepareTeamImportJson = (
  json: string
): { wireJson: string; pending: PendingOAuthToken[] } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { wireJson: json, pending: [] }
  }

  const pending: PendingOAuthToken[] = []
  let changed = false
  const folders = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed)
      ? [parsed]
      : []

  for (const folder of folders) {
    if (isRecord(folder) && redactImportedFolder(folder, pending)) {
      changed = true
    }
  }

  if (!changed) return { wireJson: json, pending }
  return { wireJson: JSON.stringify(parsed), pending }
}

export const stripOAuthTokensFromJsonString = (json: string): string =>
  prepareTeamImportJson(json).wireJson
