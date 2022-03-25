<template>
  <AppPaneLayout>
    <template #primary>
      <HttpRequest />
      <HttpRequestOptions />
    </template>
    <template #secondary>
      <HttpResponse />
    </template>
    <template #sidebar>
      <HttpSidebar />
    </template>
  </AppPaneLayout>
</template>

<script lang="ts">
import {
  defineComponent,
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  Ref,
  ref,
  useContext,
  watch,
} from "@nuxtjs/composition-api"
import { Subscription } from "rxjs"
import isEqual from "lodash/isEqual"
import {
  HoppRESTRequest,
  HoppRESTAuthOAuth2,
  safelyExtractRESTRequest,
} from "@hoppscotch/data"
import {
  getRESTRequest,
  setRESTRequest,
  setRESTAuth,
  restAuth$,
  getDefaultRESTRequest,
} from "~/newstore/RESTSession"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import {
  pluckRef,
  useI18n,
  useStream,
  useToast,
} from "~/helpers/utils/composables"
import { loadRequestFromSync, startRequestSync } from "~/helpers/fb/request"
import { onLoggedIn } from "~/helpers/fb/auth"
import { oauthRedirect } from "~/helpers/oauth"

function bindRequestToURLParams() {
  const { route } = useContext()
  // Get URL parameters and set that as the request
  onMounted(() => {
    const query = route.value.query
    // If query params are empty, or contains code or error param (these are from Oauth Redirect)
    // We skip URL params parsing
    if (Object.keys(query).length === 0 || query.code || query.error) return
    setRESTRequest(
      safelyExtractRESTRequest(
        translateExtURLParams(query),
        getDefaultRESTRequest()
      )
    )
  })
}

function oAuthURL() {
  const auth = useStream(
    restAuth$,
    { authType: "none", authActive: true },
    setRESTAuth
  )

  const oauth2Token = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "token")

  onBeforeMount(async () => {
    const tokenInfo = await oauthRedirect()
    if (Object.prototype.hasOwnProperty.call(tokenInfo, "access_token")) {
      if (typeof tokenInfo === "object") {
        oauth2Token.value = tokenInfo.access_token
      }
    }
  })
}

function setupRequestSync(
  confirmSync: Ref<boolean>,
  requestForSync: Ref<HoppRESTRequest | null>
) {
  const { route } = useContext()

  // Subscription to request sync
  let sub: Subscription | null = null

  // Load request on login resolve and start sync
  onLoggedIn(async () => {
    if (
      Object.keys(route.value.query).length === 0 &&
      !(route.value.query.code || route.value.query.error)
    ) {
      const request = await loadRequestFromSync()
      if (request) {
        // setRESTRequest(request)
        if (!isEqual(request, getRESTRequest())) {
          requestForSync.value = request
          confirmSync.value = true
        }
      }
    }

    sub = startRequestSync()
  })

  // Stop subscription to stop syncing
  onBeforeUnmount(() => {
    sub?.unsubscribe()
  })
}

export default defineComponent({
  setup() {
    const requestForSync = ref<HoppRESTRequest | null>(null)

    const confirmSync = ref(false)

    const toast = useToast()
    const t = useI18n()

    watch(confirmSync, (newValue) => {
      if (newValue) {
        toast.show(`${t("confirm.sync")}`, {
          duration: 0,
          action: [
            {
              text: `${t("action.yes")}`,
              onClick: (_, toastObject) => {
                syncRequest()
                toastObject.goAway(0)
              },
            },
            {
              text: `${t("action.no")}`,
              onClick: (_, toastObject) => {
                toastObject.goAway(0)
              },
            },
          ],
        })
      }
    })

    const syncRequest = () => {
      setRESTRequest(
        safelyExtractRESTRequest(requestForSync.value!, getDefaultRESTRequest())
      )
    }

    setupRequestSync(confirmSync, requestForSync)
    bindRequestToURLParams()

    return {
      confirmSync,
      syncRequest,
      oAuthURL,
      requestForSync,
    }
  },
})
</script>
