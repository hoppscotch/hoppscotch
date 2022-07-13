import { useContext } from "@nuxtjs/composition-api"
import * as Sentry from "@sentry/browser"

export function useSentry() {
  // TODO: Make Sentry load lazy at some point ? (see nuxt/sentry)
  const { $sentry } = useContext()
  return $sentry as any as typeof Sentry
}
