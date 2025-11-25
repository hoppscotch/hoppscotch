import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { V4_SCHEMA, v4_baseCollectionSchema } from "./4"
import { generateUniqueRefId } from "../../utils/collection"
import { HoppCollection } from ".."

export const v5_baseCollectionSchema = v4_baseCollectionSchema.extend({
  v: z.literal(5),
  _ref_id: z.string().optional(),
})

type Input = z.input<typeof v5_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v5_baseCollectionSchema> & {
  folders: Output[]
}

export const V5_SCHEMA = v5_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(HoppCollection, 5))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V5_SCHEMA,
  up(old: z.infer<typeof V4_SCHEMA>) {
    const result: z.infer<typeof V5_SCHEMA> = {
      ...old,
      v: 5 as const,
      _ref_id: generateUniqueRefId("coll"),
      folders: old.folders.map((folder) => {
        const result = HoppCollection.safeParseUpToVersion(folder, 5)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
