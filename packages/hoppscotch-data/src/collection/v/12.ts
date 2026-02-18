import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/9"
import { HoppRESTAuth } from "../../rest/v/18/auth"

import { HoppCollection } from ".."
import { v11_baseCollectionSchema, V11_SCHEMA } from "./11"

export const v12_baseCollectionSchema = v11_baseCollectionSchema.extend({
  v: z.literal(12),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v12_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v12_baseCollectionSchema> & {
  folders: Output[]
}

export const V12_SCHEMA = v12_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 12))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V12_SCHEMA,
  up(old: z.infer<typeof V11_SCHEMA>) {
    let newAuth: z.infer<typeof V12_SCHEMA>["auth"]

    if (old.auth.authType === "aws-signature") {
      newAuth = {
        ...old.auth,
        credentialMode: "manual",
        profileName: "",
      } as z.infer<typeof V12_SCHEMA>["auth"]
    } else {
      newAuth = old.auth as z.infer<typeof V12_SCHEMA>["auth"]
    }

    const result: z.infer<typeof V12_SCHEMA> = {
      ...old,
      v: 12 as const,
      auth: newAuth,
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 12)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
