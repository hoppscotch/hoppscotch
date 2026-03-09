import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/7"
import { HoppRESTAuth } from "../../rest/v/8/auth"

import { V3_SCHEMA, v3_baseCollectionSchema } from "./3"
import { HoppCollection } from ".."

export const v4_baseCollectionSchema = v3_baseCollectionSchema.extend({
  v: z.literal(4),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v4_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v4_baseCollectionSchema> & {
  folders: Output[]
}

export const V4_SCHEMA = v4_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 4))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V4_SCHEMA,
  up(old: z.infer<typeof V3_SCHEMA>) {
    const result: z.infer<typeof V4_SCHEMA> = {
      ...old,
      v: 4 as const,
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 4)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
