import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppCollection } from ".."
import { v10_baseCollectionSchema } from "./10"

export const v11_baseCollectionSchema = v10_baseCollectionSchema.extend({
  v: z.literal(11),
  description: z.string().nullable().catch(null),
})

type Input = z.input<typeof v11_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v11_baseCollectionSchema> & {
  folders: Output[]
}

export const V11_SCHEMA = v11_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 11))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V11_SCHEMA,
  up(old: z.infer<typeof V11_SCHEMA>) {
    const result: z.infer<typeof V11_SCHEMA> = {
      ...old,
      v: 11 as const,
      description: old.description ?? null,
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 11)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
