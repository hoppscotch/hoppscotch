import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { HoppCollection } from ".."
import { v11_baseCollectionSchema } from "./11"

export const v12_baseCollectionSchema = v11_baseCollectionSchema.extend({
  v: z.literal(12),
  preRequestScript: z.string().catch(""),
  testScript: z.string().catch(""),
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
  up(old: z.infer<typeof V12_SCHEMA>) {
    const result: z.infer<typeof V12_SCHEMA> = {
      ...old,
      v: 12 as const,
      preRequestScript: old.preRequestScript ?? "",
      testScript: old.testScript ?? "",
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
