import { field } from "fp-ts"
import { z } from "zod"

export const CookieSchema = z.object({
  name: z.string(), // Cookie name
  value: z.string(), // Cookie value
  domain: z.string(), // Domain the cookie belongs to
  path: z.string(), // Path scope of the cookie (default: "/")
  expires: z.string().optional(), // Expiration date in ISO format, null for session cookies
  maxAge: z.number().optional(), // Maximum age in seconds, null if not set
  httpOnly: z.boolean(), // Whether cookie is HTTP-only (not accessible via JavaScript)
  secure: z.boolean(), // Whether cookie should only be sent over HTTPS
  sameSite: z.enum(["None", "Lax", "Strict"]), // SameSite attribute for CSRF protection
})

export type Cookie = z.infer<typeof CookieSchema>
