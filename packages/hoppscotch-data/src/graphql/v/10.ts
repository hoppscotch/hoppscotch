import { defineVersion } from "verzod"
import { z } from "zod"
import { V9_SCHEMA } from "./9"
import { generateUniqueRefId } from "../../utils/collection"
import { HoppGQLRequestResponses } from "../../gql-request-response"

export const V10_SCHEMA = V9_SCHEMA.extend({
  v: z.literal(10),
  _ref_id: z.string().optional(),
  description: z.string().nullable().catch(null),
  responses: HoppGQLRequestResponses.catch({}),
})

export default defineVersion({
  schema: V10_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V9_SCHEMA>) {
    return {
      ...old,
      v: 10 as const,
      _ref_id: generateUniqueRefId("req"),
      description: null,
      responses: {},
    }
  },
})
