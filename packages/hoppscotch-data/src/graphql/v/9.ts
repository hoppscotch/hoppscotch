import { defineVersion } from "verzod"
import { z } from "zod"

import {
  HoppGQLAuthBasic,
  HoppGQLAuthBearer,
  HoppGQLAuthInherit,
  HoppGQLAuthNone,
} from "./2"
import { HoppGQLAuthAPIKey } from "./4"
import { HoppGQLAuthAWSSignature } from "./6"
import { HoppRESTAuthOAuth2 } from "../../rest/v/15/auth"
import { V8_SCHEMA } from "./8"

export { HoppRESTAuthOAuth2 as HoppGQLAuthOAuth2 } from "../../rest/v/15/auth"

export const HoppGQLAuth = z
  .discriminatedUnion("authType", [
    HoppGQLAuthNone,
    HoppGQLAuthInherit,
    HoppGQLAuthBasic,
    HoppGQLAuthBearer,
    HoppRESTAuthOAuth2,
    HoppGQLAuthAPIKey,
    HoppGQLAuthAWSSignature,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppGQLAuth = z.infer<typeof HoppGQLAuth>

export const V9_SCHEMA = V8_SCHEMA.extend({
  v: z.literal(9),
  auth: HoppGQLAuth,
})

export default defineVersion({
  schema: V9_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V8_SCHEMA>) {
    // If the auth is OAuth2, migrate it to include the new advanced parameters
    let newAuth: z.infer<typeof HoppGQLAuth>
    if (old.auth.authType === "oauth-2") {
      const oldGrantTypeInfo = old.auth.grantTypeInfo
      let newGrantTypeInfo

      // Add the advanced parameters to the appropriate grant type
      if (oldGrantTypeInfo.grantType === "AUTHORIZATION_CODE") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          authRequestParams: [],
          tokenRequestParams: [],
          refreshRequestParams: [],
        }
      } else if (oldGrantTypeInfo.grantType === "CLIENT_CREDENTIALS") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          tokenRequestParams: [],
          refreshRequestParams: [],
        }
      } else if (oldGrantTypeInfo.grantType === "PASSWORD") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          tokenRequestParams: [],
          refreshRequestParams: [],
        }
      } else if (oldGrantTypeInfo.grantType === "IMPLICIT") {
        newGrantTypeInfo = {
          ...oldGrantTypeInfo,
          authRequestParams: [],
          refreshRequestParams: [],
        }
      } else {
        newGrantTypeInfo = oldGrantTypeInfo
      }

      newAuth = {
        ...old.auth,
        grantTypeInfo: newGrantTypeInfo,
      } as z.infer<typeof HoppGQLAuth>
    } else {
      newAuth = old.auth
    }

    return {
      ...old,
      v: 9 as const,
      auth: newAuth,
    }
  },
})
