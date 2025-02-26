import { Service } from "dioc"
import { PersistenceService } from "../persistence"
import { ZodType, z } from "zod"
import * as E from "fp-ts/Either"
import authCode, { AuthCodeOauthFlowParams } from "./flows/authCode"
import implicit, { ImplicitOauthFlowParams } from "./flows/implicit"
import { getService } from "~/modules/dioc"
import { HoppCollection } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/backend/graphql"
import { Response } from "@hoppscotch/kernel"

export type PersistedOAuthConfig = {
  source: "REST" | "GraphQL"
  context?: {
    type: "collection-properties" | "request-tab"
    metadata: {
      collection?: HoppCollection | TeamCollection
      collectionID?: string
    }
  }
  grant_type: string
  fields?: (AuthCodeOauthFlowParams | ImplicitOauthFlowParams) & {
    state: string
  }
  token?: string
  refresh_token?: string
}

const persistenceService = getService(PersistenceService)

export const grantTypesInvolvingRedirect = ["AUTHORIZATION_CODE", "IMPLICIT"]

export const routeOAuthRedirect = async () => {
  const localOAuthTempConfig =
    persistenceService.getLocalConfig("oauth_temp_config")
  if (!localOAuthTempConfig) return E.left("INVALID_STATE")

  const expectedSchema = z.object({
    source: z.optional(z.string()),
    grant_type: z.string(),
  })

  const decodedLocalConfig = expectedSchema.safeParse(
    JSON.parse(localOAuthTempConfig)
  )
  if (!decodedLocalConfig.success) return E.left("INVALID_STATE")

  const flowConfig = [authCode, implicit].find(
    (flow) => flow.flow === decodedLocalConfig.data.grant_type
  )

  if (!flowConfig) return E.left("INVALID_STATE")
  return flowConfig?.onRedirectReceived(localOAuthTempConfig)
}

export function createFlowConfig<
  Flow extends string,
  AuthParams extends Record<string, unknown>,
  InitFuncReturnObject extends Record<string, unknown>,
  RefreshTokenParams extends Record<string, unknown>,
>(
  flow: Flow,
  params: ZodType<AuthParams>,
  init: (
    params: AuthParams
  ) =>
    | E.Either<string, InitFuncReturnObject | undefined>
    | Promise<E.Either<string, InitFuncReturnObject | undefined>>,
  onRedirectReceived: (
    localConfig: string
  ) => Promise<
    E.Either<string, { access_token: string; refresh_token?: string }>
  >,
  refreshToken?: (
    params: RefreshTokenParams
  ) => Promise<
    E.Either<string, { access_token: string; refresh_token?: string }>
  >
) {
  return { flow, params, init, onRedirectReceived, refreshToken }
}

export const decodeResponseAsJSON = (response: Response) => {
  if (response.content.kind !== "json") {
    return E.left("AUTH_TOKEN_REQUEST_FAILED" as const)
  }
  return E.right(response.content.content as Record<string, unknown>)
}

export const generateRandomString = () => {
  const length = 64
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], "")
}

export class OauthAuthService extends Service {
  public static readonly ID = "OAUTH_AUTH_SERVICE"
  static redirectURI = `${window.location.origin}/oauth`
}
