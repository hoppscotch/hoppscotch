import { Service } from "dioc"
import { computed, reactive, ref } from "vue"

import type { OAuthTokenRecord } from "~/helpers/teamOAuthTokens"
import { TEAM_OAUTH_TOKENS_SCHEMA } from "~/services/persistence/validation-schemas"

/**
 * OAuth tokens for team collections and requests, scoped to the signed-in
 * member. Not written to the team backend. Persisted locally by
 * `PersistenceService`.
 *
 * The active map is cleared when the account changes so a later session on
 * this browser cannot read the previous member's tokens. Each member's copy
 * stays in `storedByUser` and is restored when they sign back in.
 */
export class TeamOAuthTokenService extends Service {
  public static readonly ID = "TEAM_OAUTH_TOKEN_SERVICE"

  /**
   * Bumps when requests already stored in the collection tree should copy
   * tokens again. Account changes and persistence loads bump it here. A
   * committed request token bumps it from `commitTokenSyncPlan`, because
   * that write can land after the tree has snapshotted the previous token.
   */
  public revision = ref(0)

  private activeUserId: string | null = null

  private readonly storedByUser = reactive(
    new Map<string, Map<string, OAuthTokenRecord>>()
  )

  /** Tokens for the signed-in member. Empty when nobody is signed in. */
  public tokens = reactive(new Map<string, OAuthTokenRecord>())

  /**
   * Switch the active member. `null` clears the in-memory map (logout)
   * without deleting that member's persisted copy.
   */
  public setActiveUser(userId: string | null) {
    if (this.activeUserId === userId) return
    this.activeUserId = userId
    this.replaceActiveMapFromStore()
    this.revision.value++
  }

  public remember(key: string, record: OAuthTokenRecord) {
    if (!key || !this.activeUserId) return
    if (!record.token && !record.refreshToken) {
      this.forget(key)
      return
    }

    const stored: OAuthTokenRecord = {
      token: record.token,
      ...(record.refreshToken !== undefined
        ? { refreshToken: record.refreshToken }
        : {}),
    }

    this.tokens.set(key, stored)
    this.userTokens(this.activeUserId).set(key, stored)
  }

  public recall(key: string): OAuthTokenRecord | undefined {
    return this.tokens.get(key)
  }

  public forget(key: string) {
    this.tokens.delete(key)
    if (!this.activeUserId) return
    this.storedByUser.get(this.activeUserId)?.delete(key)
  }

  public loadFromPersistedState(
    data: Record<string, Record<string, OAuthTokenRecord>>
  ) {
    this.storedByUser.clear()

    for (const [userId, tokens] of Object.entries(data)) {
      if (!userId) continue
      const map = reactive(new Map<string, OAuthTokenRecord>())
      for (const [key, record] of Object.entries(tokens)) {
        if (!key || !record || typeof record.token !== "string") continue
        if (!record.token && !record.refreshToken) continue
        map.set(key, {
          token: record.token,
          ...(record.refreshToken !== undefined
            ? { refreshToken: record.refreshToken }
            : {}),
        })
      }
      if (map.size > 0) this.storedByUser.set(userId, map)
    }

    this.replaceActiveMapFromStore()
    this.revision.value++
  }

  public persistableTokens = computed(() => {
    const users: Record<string, Record<string, OAuthTokenRecord>> = {}
    this.storedByUser.forEach((map, userId) => {
      const tokens: Record<string, OAuthTokenRecord> = {}
      map.forEach((record, key) => {
        tokens[key] = record
      })
      if (Object.keys(tokens).length > 0) users[userId] = tokens
    })
    return users
  })

  private userTokens(userId: string) {
    let map = this.storedByUser.get(userId)
    if (!map) {
      map = reactive(new Map<string, OAuthTokenRecord>())
      this.storedByUser.set(userId, map)
    }
    return map
  }

  private replaceActiveMapFromStore() {
    this.tokens.clear()
    if (!this.activeUserId) return

    this.storedByUser.get(this.activeUserId)?.forEach((record, key) => {
      this.tokens.set(key, { ...record })
    })
  }
}

const isLegacyUnscopedTeamOAuthTokenMap = (data: object): boolean =>
  Object.values(data).some(
    (value) =>
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "token" in value &&
      typeof (value as { token: unknown }).token === "string"
  )

/**
 * Read a persisted token document. Unscoped maps (keyed only by request or
 * collection id) are dropped: they cannot be attributed to a member, so
 * applying them would hand the next account the previous account's tokens.
 * `null` means the document is not a token store.
 */
export const readScopedTeamOAuthTokenStore = (
  data: unknown
): {
  tokens: Record<string, Record<string, OAuthTokenRecord>>
  legacyUnscoped: boolean
} | null => {
  const parsed = TEAM_OAUTH_TOKENS_SCHEMA.safeParse(data)
  if (!parsed.success || !parsed.data || typeof parsed.data !== "object") {
    return null
  }

  if (isLegacyUnscopedTeamOAuthTokenMap(parsed.data)) {
    return { tokens: {}, legacyUnscoped: true }
  }

  return {
    tokens: parsed.data as Record<string, Record<string, OAuthTokenRecord>>,
    legacyUnscoped: false,
  }
}
