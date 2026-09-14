import type { RelayCapabilities } from "@hoppscotch/kernel"

export const supportsGRPC = (
  capabilities: RelayCapabilities | undefined
): boolean =>
  !!capabilities?.content.has("binary") && capabilities.advanced.has("http2")
