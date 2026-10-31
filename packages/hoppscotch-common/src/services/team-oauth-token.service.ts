import { Service } from "dioc"
import { computed, reactive } from "vue"

import type { OAuthTokenRecord } from "~/helpers/teamOAuthTokens"

/**
 * Per-user OAuth tokens for team collections and requests.
 * Not written to the team backend. Persisted locally by `PersistenceService`.
 */
export class TeamOAuthTokenService extends Service {
  public static readonly ID = "TEAM_OAUTH_TOKEN_SERVICE"

  public tokens = reactive(new Map<string, OAuthTokenRecord>())

  public remember(key: string, record: OAuthTokenRecord) {
    if (!key) return
    if (!record.token && !record.refreshToken) {
      this.tokens.delete(key)
      return
    }

    this.tokens.set(key, {
      token: record.token,
      ...(record.refreshToken !== undefined
        ? { refreshToken: record.refreshToken }
        : {}),
    })
  }

  public recall(key: string): OAuthTokenRecord | undefined {
    return this.tokens.get(key)
  }

  public forget(key: string) {
    this.tokens.delete(key)
  }

  public loadFromPersistedState(data: Record<string, OAuthTokenRecord>) {
    this.tokens.clear()

    Object.entries(data).forEach(([key, record]) => {
      if (!record || typeof record.token !== "string") return
      this.remember(key, record)
    })
  }

  public persistableTokens = computed(() => {
    const tokens: Record<string, OAuthTokenRecord> = {}
    this.tokens.forEach((record, key) => {
      tokens[key] = record
    })
    return tokens
  })
}
