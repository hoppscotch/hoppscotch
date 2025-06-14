import { z } from "zod"

import { V10_SCHEMA } from "../10"
import { defineVersion } from "verzod"

import { HoppRESTAuth } from "./auth"

export const V11_SCHEMA = V10_SCHEMA.extend({
  v: z.literal("11"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V11_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V10_SCHEMA>) {
    const auth = old.auth

    return {
      ...old,
      v: "11" as const,
      auth:
        auth.authType === "oauth-2"
          ? {
              ...auth,
              grantTypeInfo:
                auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS"
                  ? {
                      ...auth.grantTypeInfo,
                      clientAuthentication: "IN_BODY" as const,
                    }
                  : auth.grantTypeInfo,
            }
          : auth,
    }
  },
})
