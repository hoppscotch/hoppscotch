import { z } from "zod"
import { defineVersion } from "verzod"

import { V17_SCHEMA } from "./17"
import { HoppRESTAuth } from "./18/auth"

export const V18_SCHEMA = V17_SCHEMA.extend({
  v: z.literal("18"),
  auth: HoppRESTAuth,
})

const V18_VERSION = defineVersion({
  schema: V18_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V17_SCHEMA>) {
    let newAuth: z.infer<typeof HoppRESTAuth>

    if (
      old.auth.authType === "oauth-2" &&
      (old.auth.grantTypeInfo.grantType === "AUTHORIZATION_CODE" ||
        old.auth.grantTypeInfo.grantType === "CLIENT_CREDENTIALS")
    ) {
      newAuth = {
        ...old.auth,
        grantTypeInfo: {
          ...old.auth.grantTypeInfo,
          clientAuthentication: "IN_BODY" as const,
        },
      } as z.infer<typeof HoppRESTAuth>
    } else {
      newAuth = old.auth as z.infer<typeof HoppRESTAuth>
    }

    return {
      ...old,
      v: "18" as const,
      auth: newAuth,
    }
  },
})

export default V18_VERSION
