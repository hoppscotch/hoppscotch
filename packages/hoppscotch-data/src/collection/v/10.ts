import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppCollection } from ".."
import { v9_baseCollectionSchema } from "./9"

export const CollectionVariable = z.object({
  key: z.string(),
  initialValue: z.string(),
  currentValue: z.string(),
  secret: z.boolean(),
})

export type CollectionVariable = z.infer<typeof CollectionVariable>

export const v10_baseCollectionSchema = v9_baseCollectionSchema.extend({
  v: z.literal(10),
  variables: z.array(CollectionVariable),
})

type Input = z.input<typeof v10_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v10_baseCollectionSchema> & {
  folders: Output[]
}

export const V10_SCHEMA = v10_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 10))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V10_SCHEMA,
  up(old: z.infer<typeof V10_SCHEMA>) {
    const result: z.infer<typeof V10_SCHEMA> = {
      ...old,
      v: 10 as const,
      variables: [],
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 10)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
