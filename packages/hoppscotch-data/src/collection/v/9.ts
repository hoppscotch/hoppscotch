import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/9"
import { HoppRESTAuth } from "../../rest/v/15/auth"

import { HoppCollection } from ".."
import { v8_baseCollectionSchema, V8_SCHEMA } from "./8"

export const v9_baseCollectionSchema = v8_baseCollectionSchema.extend({
  v: z.literal(9),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v9_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v9_baseCollectionSchema> & {
  folders: Output[]
}

export const V9_SCHEMA = v9_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 9))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V9_SCHEMA,
  up(old: z.infer<typeof V8_SCHEMA>) {
    // Migrate auth field if it's OAuth2 to include new advanced parameters
    let newAuth: z.infer<typeof V9_SCHEMA>["auth"]
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
      } as z.infer<typeof V9_SCHEMA>["auth"]
    } else {
      newAuth = old.auth
    }

    const result: z.infer<typeof V9_SCHEMA> = {
      ...old,
      v: 9 as const,
      auth: newAuth,
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 9)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
