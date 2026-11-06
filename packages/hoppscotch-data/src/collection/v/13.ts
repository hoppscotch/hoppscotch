import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppCollection } from ".."
import { v12_baseCollectionSchema, V12_SCHEMA } from "./12"

export const CollectionSourceSchema = z.object({
  type: z.literal("url"),
  url: z.string().url(),
  format: z.enum(["postman", "openapi", "insomnia", "hoppscotch", "har"]),
  lastSyncedAt: z.string().datetime().optional(),
})

export const v13_baseCollectionSchema = v12_baseCollectionSchema.extend({
  v: z.literal(13),
  source: CollectionSourceSchema.optional(),
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
    const result: z.infer<typeof V13_SCHEMA> = {
      ...old,
      v: 13 as const,
      folders: old.folders.map((folder) => {
        const migrated = HoppCollection.safeParseUpToVersion(folder, 13)

        if (migrated.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return migrated.value
      }),
    }

    return result
  },
})
