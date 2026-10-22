import { defineVersion } from "verzod"
import { z } from "zod"

import { GQLHeader } from "../../../graphql/v/6"
import { HoppGQLAuth } from "../../../graphql/v/9"

export const V1_SCHEMA = z.object({
  v: z.literal("1"),
  name: z.string(),
  url: z.string(),
  query: z.string(),
  variables: z.string(),
  headers: z.array(GQLHeader).catch([]),
  auth: HoppGQLAuth,
})

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
