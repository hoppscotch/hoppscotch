import { platform } from "~/platform"
import * as E from "fp-ts/Either"

// Default proxy URL — overridable at container boot via the runtime env-var
// rewrite (see aio_run.mjs / @import-meta-env). Falls back to a local
// proxyscotch sidecar so self-hosted / branded deployments work without a
// browser extension or reliance on the public Hoppscotch proxy.
export const DEFAULT_HOPP_PROXY_URL =
  import.meta.env.VITE_APP_PROXY_URL || "http://localhost:9159/"

// Get default proxy URL from platform or return default
export const getDefaultProxyUrl = async () => {
  const proxyAppUrl = platform?.infra?.getProxyAppUrl

  if (proxyAppUrl) {
    const res = await proxyAppUrl()

    if (E.isRight(res)) {
      return res.right.value
    }

    return DEFAULT_HOPP_PROXY_URL
  }

  return DEFAULT_HOPP_PROXY_URL
}
