import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppGQLAuth } from "../../graphql/v/8"
import { HoppRESTAuth } from "../../rest/v/13/auth"

import { HoppCollection } from ".."
import { v7_baseCollectionSchema, V7_SCHEMA } from "./7"

export const v8_baseCollectionSchema = v7_baseCollectionSchema.extend({
  v: z.literal(8),
  auth: z.union([HoppRESTAuth, HoppGQLAuth]),
})

type Input = z.input<typeof v8_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v8_baseCollectionSchema> & {
  folders: Output[]
}

export const V8_SCHEMA = v8_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 8))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V8_SCHEMA,
  up(old: z.infer<typeof V7_SCHEMA>) {
    const result: z.infer<typeof V8_SCHEMA> = {
      ...old,
      v: 8 as const,
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 8)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
