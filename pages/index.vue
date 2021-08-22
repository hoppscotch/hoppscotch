<template>
  <Splitpanes class="smart-splitter" :dbl-click-splitter="false" vertical>
    <Pane class="hide-scrollbar !overflow-auto">
      <Splitpanes class="smart-splitter" :dbl-click-splitter="false" horizontal>
        <Pane class="hide-scrollbar !overflow-auto">
          <HttpRequest />
          <SmartTabs styles="sticky top-upperPrimaryStickyFold z-10">
            <SmartTab
              :id="'params'"
              :label="$t('tab.parameters')"
              :selected="true"
              :info="newActiveParamsCount$"
            >
              <HttpParameters />
            </SmartTab>

            <SmartTab :id="'bodyParams'" :label="$t('tab.body')">
              <HttpBody />
            </SmartTab>

            <SmartTab
              :id="'headers'"
              :label="$t('tab.headers')"
              :info="newActiveHeadersCount$"
            >
              <HttpHeaders />
            </SmartTab>

            <SmartTab :id="'authorization'" :label="$t('tab.authorization')">
              <HttpAuthorization />
            </SmartTab>

            <SmartTab
              :id="'preRequestScript'"
              :label="$t('tab.pre_request_script')"
            >
              <HttpPreRequestScript />
            </SmartTab>

            <SmartTab :id="'tests'" :label="$t('tab.tests')">
              <HttpTests />
            </SmartTab>
          </SmartTabs>
        </Pane>
        <Pane class="hide-scrollbar !overflow-auto">
          <HttpResponse ref="response" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="RIGHT_SIDEBAR"
      max-size="35"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto"
    >
      <aside>
        <SmartTabs styles="sticky z-10 top-0">
          <SmartTab :id="'history'" :label="$t('tab.history')" :selected="true">
            <History ref="historyComponent" :page="'rest'" />
          </SmartTab>

          <SmartTab :id="'collections'" :label="$t('tab.collections')">
            <Collections />
          </SmartTab>

          <SmartTab :id="'env'" :label="$t('environment.title')">
            <Environments />
          </SmartTab>
        </SmartTabs>
      </aside>
    </Pane>
    <SmartConfirmModal
      :show="confirmSync"
      :title="$t('confirm.sync')"
      @hide-modal="confirmSync = false"
      @resolve="syncRequest"
    />
  </Splitpanes>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  ref,
  useContext,
  watch,
} from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { map } from "rxjs/operators"
import { Subscription } from "rxjs"
import { useSetting } from "~/newstore/settings"
import {
  restRequest$,
  restActiveParamsCount$,
  restActiveHeadersCount$,
  getRESTRequest,
  setRESTRequest,
} from "~/newstore/RESTSession"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "~/helpers/utils/composables"
import { loadRequestFromSync, startRequestSync } from "~/helpers/fb/request"
import { onLoggedIn } from "~/helpers/fb/auth"
import { HoppRESTRequest } from "~/helpers/types/HoppRESTRequest"

function bindRequestToURLParams() {
  const {
    route,
    app: { router },
  } = useContext()

  const request = useStream(restRequest$, getRESTRequest(), setRESTRequest)

  // Process headers and params to proper values
  const headers = computed(() => {
    const filtered = request.value.headers.filter((x) => x.key !== "")

    return filtered.length > 0 ? JSON.stringify(filtered) : null
  })

  const params = computed(() => {
    const filtered = request.value.params.filter((x) => x.key !== "")
    return filtered.length > 0 ? JSON.stringify(filtered) : null
  })

  // Combine them together to a cleaner value
  const urlParams = computed(() => ({
    v: request.value.v,
    method: request.value.method,
    endpoint: request.value.endpoint,
    headers: headers.value,
    params: params.value,
  }))

  // Watch and update accordingly
  watch(urlParams, () => {
    history.replaceState(
      window.location.href,
      "",
      `${router!.options.base}?${encodeURI(
        Object.entries(urlParams.value)
          .filter((x) => x[1] !== null)
          .map((x) => `${x[0]}=${x[1]!}`)
          .join("&")
      )}`
    )
  })

  // Now, we have to see the initial URL param and set that as the request
  onMounted(() => {
    const query = route.value.query

    if (Object.keys(query).length === 0) return
    setRESTRequest(translateExtURLParams(query))
  })
}

function setupRequestSync() {
  const { route } = useContext()

  // Subscription to request sync
  let sub: Subscription | null = null

  // Load request on login resolve and start sync
  onLoggedIn(async () => {
    if (Object.keys(route.value.query).length === 0) {
      const request = await loadRequestFromSync()
      if (request) {
        console.log("sync le request nnd")

        setRESTRequest(request)
        // confirmSync.value = true
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
  components: { Splitpanes, Pane },
  setup() {
    const confirmSync = ref(false)

    const internalInstance = getCurrentInstance()
    console.log("yoo", internalInstance)

    const syncRequest = (request: HoppRESTRequest) => {
      console.log("syncinggg")
      setRESTRequest(request)
    }

    const { subscribeToStream } = useStreamSubscriber()

    setupRequestSync()
    bindRequestToURLParams()

    subscribeToStream(restRequest$, (x) => {
      console.log(x)
    })

    return {
      newActiveParamsCount$: useReadonlyStream(
        restActiveParamsCount$.pipe(
          map((e) => {
            if (e === 0) return null
            return e.toString()
          })
        ),
        null
      ),
      newActiveHeadersCount$: useReadonlyStream(
        restActiveHeadersCount$.pipe(
          map((e) => {
            if (e === 0) return null
            return e.toString()
          })
        ),
        null
      ),
      RIGHT_SIDEBAR: useSetting("RIGHT_SIDEBAR"),
      PROXY_ENABLED: useSetting("PROXY_ENABLED"),
      URL_EXCLUDES: useSetting("URL_EXCLUDES"),
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
      confirmSync,
      syncRequest,
    }
  },
})
</script>
