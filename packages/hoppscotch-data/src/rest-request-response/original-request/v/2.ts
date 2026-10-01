import { defineVersion } from "verzod"
import { z } from "zod"
import { V1_SCHEMA } from "./1"
import { HoppRESTReqBody } from "../../../rest/v/9/body"

export const V2_SCHEMA = V1_SCHEMA.extend({
  v: z.literal("2"),
  body: HoppRESTReqBody,
})

export default defineVersion({
  initial: false,
  schema: V2_SCHEMA,
  up(old: z.infer<typeof V1_SCHEMA>) {
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
      v: "2" as const,
      body: migratedBody as any,
    }
  },
})
