import { z } from "zod"
import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "../1"
import { HoppRESTAuthAPIKey } from "../4"
import { HoppRESTAuthAWSSignature as HoppRESTAuthAWSSignatureOld } from "../7"
import { HoppRESTAuthDigest } from "../8/auth"
import { HoppRESTAuthAkamaiEdgeGrid, HoppRESTAuthHAWK } from "../12/auth"
import { HoppRESTAuthJWT } from "../13/auth"
import {
  HoppRESTAuthOAuth2,
} from "../15/auth"

export const HoppRESTAuthAWSSignature = HoppRESTAuthAWSSignatureOld.extend({
  credentialMode: z.enum(["manual", "profile"]).catch("manual"),
  profileName: z.string().catch(""),
})

export type HoppRESTAuthAWSSignature = z.infer<typeof HoppRESTAuthAWSSignature>

export const HoppRESTAuth = z
  .discriminatedUnion("authType", [
    HoppRESTAuthNone,
    HoppRESTAuthInherit,
    HoppRESTAuthBasic,
    HoppRESTAuthBearer,
    HoppRESTAuthOAuth2,
    HoppRESTAuthAPIKey,
    HoppRESTAuthAWSSignature,
    HoppRESTAuthDigest,
    HoppRESTAuthHAWK,
    HoppRESTAuthAkamaiEdgeGrid,
    HoppRESTAuthJWT,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>
