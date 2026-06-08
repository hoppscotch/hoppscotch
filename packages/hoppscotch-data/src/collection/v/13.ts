import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/9"
import { HoppRESTAuth } from "../../rest/v/18/auth"

import { HoppCollection } from ".."
import { v12_baseCollectionSchema, V12_SCHEMA } from "./12"

export const v13_baseCollectionSchema = v12_baseCollectionSchema.extend({
  v: z.literal(13),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v13_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v13_baseCollectionSchema> & {
  folders: Output[]
}

export const V13_SCHEMA = v13_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 13))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V13_SCHEMA,
  up(old: z.infer<typeof V12_SCHEMA>) {
    let newAuth: z.infer<typeof V13_SCHEMA>["auth"]

    if (old.auth.authType === "aws-signature") {
      newAuth = {
        ...old.auth,
        credentialMode: "manual",
        profileName: "",
      } as z.infer<typeof V13_SCHEMA>["auth"]
    } else {
      newAuth = old.auth as z.infer<typeof V13_SCHEMA>["auth"]
    }

    const result: z.infer<typeof V13_SCHEMA> = {
      ...old,
      v: 13 as const,
      auth: newAuth,
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 13)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
