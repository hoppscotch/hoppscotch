import { V14_SCHEMA } from "../14"

import { z } from "zod"
import { defineVersion } from "verzod"

import { HoppRESTAuth } from "./auth"

export const V15_SCHEMA = V14_SCHEMA.extend({
  v: z.literal("15"),
  auth: HoppRESTAuth,
})

const V15_VERSION = defineVersion({
  schema: V15_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V14_SCHEMA>) {
    // If the auth is OAuth2, migrate it to include the new advanced parameters
    let newAuth: z.infer<typeof HoppRESTAuth>
    if (old.auth.authType === "oauth-2") {
      newAuth = {
        ...old.auth,
        authRequestParams: [],
        tokenRequestParams: [],
        refreshRequestParams: [],
      } as z.infer<typeof HoppRESTAuth>
    } else {
      newAuth = old.auth
    }

    return {
      ...old,
      v: "15" as const,
      auth: newAuth,
    }
  },
})

export default V15_VERSION
