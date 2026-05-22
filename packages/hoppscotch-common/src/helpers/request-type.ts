import {
  HoppGQLRequest,
  HoppGQLResponseOriginalRequest,
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"

type AnyRequest =
  | HoppRESTRequest
  | HoppRESTResponseOriginalRequest
  | HoppGQLRequest
  | HoppGQLResponseOriginalRequest

/**
 * Type guard to check if a request object is GraphQL-shaped.
 * GQL requests / saved example original-requests have `url` but not `endpoint`.
 */
export function isGQLRequest(
  req: AnyRequest
): req is HoppGQLRequest | HoppGQLResponseOriginalRequest {
  return "url" in req && !("endpoint" in req)
}

/**
 * Type guard to check if a request object is REST-shaped.
 */
export function isRESTRequest(
  req: AnyRequest
): req is HoppRESTRequest | HoppRESTResponseOriginalRequest {
  return "endpoint" in req
}

/**
 * Returns true if the request has an active auth config that carries a
 * credential (token, password, secret key, etc.). Used by the share flow to
 * warn users before publishing a shortcode whose payload would expose their
 * credentials to anyone with the link.
 *
 * Errs on the side of "yes": when in doubt about an unknown auth type, we
 * treat it as carrying a secret so the user is shown the warning.
 */
export function requestHasSharedSecrets(
  req: HoppRESTRequest | HoppGQLRequest
): boolean {
  const auth = req.auth as
    | undefined
    | (Record<string, unknown> & { authActive?: boolean; authType?: string })
  if (!auth?.authActive) return false

  const nonEmpty = (v: unknown) => typeof v === "string" && v.length > 0

  switch (auth.authType) {
    case "none":
    case "inherit":
      return false

    case "basic":
      return nonEmpty(auth.username) || nonEmpty(auth.password)

    case "bearer":
      return nonEmpty(auth.token)

    case "oauth-2": {
      const info = auth.grantTypeInfo as Record<string, unknown> | undefined
      return nonEmpty(info?.token) || nonEmpty(info?.clientSecret)
    }

    case "api-key":
      return nonEmpty(auth.key) || nonEmpty(auth.value)

    case "aws-signature":
      return (
        nonEmpty(auth.accessKey) ||
        nonEmpty(auth.secretKey) ||
        nonEmpty(auth.serviceToken)
      )

    case "digest":
      return nonEmpty(auth.username) || nonEmpty(auth.password)

    case "hawk":
      return nonEmpty(auth.authKeyId) || nonEmpty(auth.authKey)

    case "jwt":
      return nonEmpty(auth.secret) || nonEmpty(auth.privateKey)

    case "akamai-eg":
      return (
        nonEmpty(auth.accessToken) ||
        nonEmpty(auth.clientSecret) ||
        nonEmpty(auth.clientToken)
      )

    case "asap":
      return nonEmpty(auth.privateKey)

    default:
      // Unknown / future auth type — warn rather than silently leak.
      return true
  }
}
