import { defineVersion } from "verzod"
import { z } from "zod"

import { V8_SCHEMA } from "../8"
import { HoppRESTReqBody } from "./body"

export const V9_SCHEMA = V8_SCHEMA.extend({
  v: z.literal("9"),
  body: HoppRESTReqBody,
})

export default defineVersion({
  schema: V9_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V8_SCHEMA>) {
    const body = old.body
    let migratedBody = body
    if (body && body.contentType === "multipart/form-data") {
      migratedBody = {
        ...body,
        body: body.body.map((entry: any) => ({
          ...entry,
          description: "",
        })),
      } as any
    }
    return {
      ...old,
      v: "9" as const,
      body: migratedBody as any,
    }
  },
})
