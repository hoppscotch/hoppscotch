<template>
  <AppPaneLayout>
    <template #primary>
      <HttpRequest />
      <SmartTabs styles="sticky bg-primary top-upperPrimaryStickyFold z-10">
        <SmartTab
          :id="'params'"
          :label="`${$t('tab.parameters')}`"
          :selected="true"
          :info="`${newActiveParamsCount$}`"
        >
          <HttpParameters />
        </SmartTab>

        <SmartTab :id="'bodyParams'" :label="`${$t('tab.body')}`">
          <HttpBody />
        </SmartTab>

        <SmartTab
          :id="'headers'"
          :label="`${$t('tab.headers')}`"
          :info="`${newActiveHeadersCount$}`"
        >
          <HttpHeaders />
        </SmartTab>

        <SmartTab :id="'authorization'" :label="`${$t('tab.authorization')}`">
          <HttpAuthorization />
        </SmartTab>

        <SmartTab
          :id="'preRequestScript'"
          :label="`${$t('tab.pre_request_script')}`"
          :indicator="
            preRequestScript && preRequestScript.length > 0 ? true : false
          "
        >
          <HttpPreRequestScript />
        </SmartTab>

        <SmartTab
          :id="'tests'"
          :label="`${$t('tab.tests')}`"
          :indicator="testScript && testScript.length > 0 ? true : false"
        >
          <HttpTests />
        </SmartTab>
      </SmartTabs>
    </template>
    <template #secondary>
      <HttpResponse ref="response" />
    </template>
    <template #sidebar>
      <SmartTabs styles="sticky bg-primary z-10 top-0" vertical>
        <SmartTab
          :id="'history'"
          icon="clock"
          :label="`${$t('tab.history')}`"
          :selected="true"
        >
          <History ref="historyComponent" :page="'rest'" />
        </SmartTab>

        <SmartTab
          :id="'collections'"
          icon="folder"
          :label="`${$t('tab.collections')}`"
        >
          <Collections />
        </SmartTab>

        <SmartTab
          :id="'env'"
          icon="layers"
          :label="`${$t('environment.title')}`"
        >
          <Environments />
        </SmartTab>
      </SmartTabs>
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
import { map } from "rxjs/operators"
import { Subscription } from "rxjs"
import isEqual from "lodash/isEqual"
import {
  HoppRESTRequest,
  HoppRESTAuthOAuth2,
  safelyExtractRESTRequest,
} from "@hoppscotch/data"
import {
  restActiveParamsCount$,
  restActiveHeadersCount$,
  getRESTRequest,
  setRESTRequest,
  setRESTAuth,
  restAuth$,
  useTestScript,
  usePreRequestScript,
  getDefaultRESTRequest,
} from "~/newstore/RESTSession"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import {
  pluckRef,
  useI18n,
  useReadonlyStream,
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

  // Stop subscripton to stop syncing
  onBeforeUnmount(() => {
    sub?.unsubscribe()
  })
}

export default defineComponent({
  setup() {
    const requestForSync = ref<HoppRESTRequest | null>(null)

    const testScript = useTestScript()
    const preRequestScript = usePreRequestScript()

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
      newActiveParamsCount$: useReadonlyStream(
        restActiveParamsCount$.pipe(
          map((e) => {
            if (e === 0) return null
            return `${e}`
          })
        ),
        null
      ),
      newActiveHeadersCount$: useReadonlyStream(
        restActiveHeadersCount$.pipe(
          map((e) => {
            if (e === 0) return null
            return `${e}`
          })
        ),
        null
      ),
      confirmSync,
      syncRequest,
      oAuthURL,
      requestForSync,
      testScript,
      preRequestScript,
    }
  },
})
</script>
