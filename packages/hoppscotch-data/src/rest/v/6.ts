import { z } from "zod"
import { defineVersion } from "verzod"
import {
  HoppRESTAuthAPIKey,
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthInherit,
  HoppRESTAuthNone,
} from "./1"
import { HoppRESTAuthOAuth2, V5_SCHEMA } from "./5"

// in this new version, we add a new auth type for AWS Signature
// this auth type is used for AWS Signature V5 authentication
// it requires the user to provide the access key id, secret access key, region, service name, and service token

export const HoppRESTAuthAWSSignature = z.object({
  authType: z.literal("aws-signature"),
  accessKey: z.string(),
  secretKey: z.string(),
  region: z.string(),
  serviceName: z.string(),
  serviceToken: z.string().optional(),
  addTo: z.enum(["HEADERS", "QUERY_PARAMS"]).catch("HEADERS"),
})

export const HoppRESTAuthHAWK = z.object({
  authType: z.literal("hawk"),
  authId: z.string(),
  authKey: z.string(),
  algorithm: z.enum(["sha1", "sha256"]).catch("sha256"),
  user: z.string().optional(),
  nonce: z.string().optional(),
  ext: z.string().optional(),
  app: z.string().optional(),
  dlg: z.string().optional(),
  timestamp: z.string().optional(),
  includePayloadHash: z.boolean().optional(),
})

export const HoppRESTAuthNTLM = z.object({
  authType: z.literal("ntlm"),
  username: z.string(),
  password: z.string(),
  domain: z.string().optional(),
  workstation: z.string().optional(),
  retryingRequest: z.boolean().optional(),
})

export const HoppRESTAuthAkamaiEdgeGrid = z.object({
  authType: z.literal("akamai-edgegrid"),
  accessToken: z.string(),
  clientToken: z.string(),
  clientSecret: z.string(),
  nonce: z.string().optional(),
  timestamp: z.string().optional(),
  host: z.string(),
  maxBody: z.number().optional(),
  headersToSign: z.string().optional(),
})

export const HoppRESTAuthASAP = z.object({
  authType: z.literal("asap"),
  algorithm: z
    .enum(["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"])
    .catch("RS256"),
  issuer: z.string(),
  audience: z.string(),
  keyId: z.string().optional(),
  privateKey: z.string(),
  subject: z.string().optional(),
  additionalClaims: z.record(z.string()).optional(),
  expiresIn: z.number().optional(),
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
    HoppRESTAuthHAWK,
    HoppRESTAuthNTLM,
    HoppRESTAuthAkamaiEdgeGrid,
    HoppRESTAuthASAP,
  ])
  .and(
    z.object({
      authActive: z.boolean(),
    })
  )

export type HoppRESTAuth = z.infer<typeof HoppRESTAuth>

export const V6_SCHEMA = V5_SCHEMA.extend({
  v: z.literal("6"),
  auth: HoppRESTAuth,
})

export default defineVersion({
  schema: V6_SCHEMA,
  initial: false,
  up(old: z.infer<typeof V5_SCHEMA>) {
    return {
      ...old,
      v: "6" as const,
    }
  },
})
