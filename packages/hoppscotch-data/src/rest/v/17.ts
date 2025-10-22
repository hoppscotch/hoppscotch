import { z } from "zod"
import { defineVersion, entityReference } from "verzod"
import { V16_SCHEMA } from "./16"
import {
  getDefaultRequestDocumentation,
  RequestDocumentation,
} from "../../documentation/request"

export const V17_SCHEMA = V16_SCHEMA.extend({
  v: z.literal("17"),
  documentation: entityReference(RequestDocumentation).nullable().catch(null),
})

const V17_VERSION = defineVersion({
  schema: V17_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V17_SCHEMA>) {
    console.log("Migrating to V17 Request", old)
    return {
      ...old,
      v: "17" as const,
      documentation:
        old.documentation ?? getDefaultRequestDocumentation(old._ref_id),
    }
  },
})

export default V17_VERSION
