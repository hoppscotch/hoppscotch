import { defineVersion } from "verzod"
import { z } from "zod"
import { V5_SCHEMA } from "./5"
import { HoppRESTAuth } from "../../../rest/v/15/auth"

export const V6_SCHEMA = V5_SCHEMA.extend({
  v: z.literal("6"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  initial: false,
  schema: V6_SCHEMA,
  up(old: z.infer<typeof V5_SCHEMA>) {
    // If the auth is OAuth2, migrate it to include the new advanced parameters
    let newAuth: z.infer<typeof HoppRESTAuth>
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
      } as z.infer<typeof HoppRESTAuth>
    } else {
      newAuth = old.auth
    }

    return {
      ...old,
      v: "6" as const,
      auth: newAuth,
    }
  },
})
