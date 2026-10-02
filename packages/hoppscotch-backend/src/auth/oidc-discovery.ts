export const OIDC_METADATA = 'OIDC_METADATA';

/**
 * Subset of the OpenID Provider Metadata needed for the authorization code flow
 * @see https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 */
export type OidcMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
};

const DISCOVERY_TIMEOUT_MS = 10_000;

/**
 * Fetch the OpenID Provider Metadata from the issuer's discovery document
 * @param issuer Issuer URL (e.g. https://login.example.com/realms/acme)
 * @returns Endpoints required to run the OIDC authorization code flow
 */
export async function discoverOidcMetadata(
  issuer: string,
): Promise<OidcMetadata> {
  const discoveryURL = `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;

  const res = await fetch(discoveryURL, {
    signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `OIDC discovery failed: ${discoveryURL} returned HTTP ${res.status}`,
    );
  }

  const metadata = await res.json();
  for (const key of [
    'issuer',
    'authorization_endpoint',
    'token_endpoint',
    'userinfo_endpoint',
  ]) {
    if (typeof metadata?.[key] !== 'string' || !metadata[key]) {
      throw new Error(`OIDC discovery document is missing "${key}"`);
    }
  }

  return {
    issuer: metadata.issuer,
    authorization_endpoint: metadata.authorization_endpoint,
    token_endpoint: metadata.token_endpoint,
    userinfo_endpoint: metadata.userinfo_endpoint,
  };
}
