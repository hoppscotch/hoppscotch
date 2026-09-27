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
  // RFC 6265 5.3 host-only-flag. True when the Set-Cookie carried no Domain
  // attribute, so the cookie applies only to the exact request host and never
  // to its subdomains. Optional and defaulted absent for backward compatibility
  // with jars persisted before the flag existed.
  hostOnly: z.boolean().optional(),
})

export type Cookie = z.infer<typeof CookieSchema>
