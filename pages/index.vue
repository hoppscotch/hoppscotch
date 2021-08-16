<template>
  <Splitpanes :dbl-click-splitter="false" vertical>
    <Pane class="hide-scrollbar !overflow-auto">
      <Splitpanes :dbl-click-splitter="false" horizontal>
        <Pane class="hide-scrollbar !overflow-auto">
          <HttpRequest />
          <SmartTabs styles="sticky top-upperPrimaryStickyFold z-10">
            <SmartTab
              :id="'params'"
              :label="$t('parameters')"
              :selected="true"
              :info="newActiveParamsCount$"
            >
              <HttpParameters />
            </SmartTab>

            <SmartTab :id="'bodyParams'" :label="$t('body')">
              <HttpBody />
            </SmartTab>

            <SmartTab
              :id="'headers'"
              :label="$t('headers')"
              :info="newActiveHeadersCount$"
            >
              <HttpHeaders />
            </SmartTab>

            <SmartTab :id="'authorization'" :label="$t('authorization')">
              <HttpAuthorization />
            </SmartTab>

            <SmartTab
              :id="'preRequestScript'"
              :label="$t('pre_request_script')"
            >
              <HttpPreRequestScript />
            </SmartTab>

            <SmartTab :id="'tests'" :label="$t('tests')">
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
          <SmartTab :id="'history'" :label="$t('history')" :selected="true">
            <History ref="historyComponent" :page="'rest'" />
          </SmartTab>

          <SmartTab :id="'collections'" :label="$t('collections')">
            <Collections />
          </SmartTab>

          <SmartTab :id="'env'" :label="$t('environment.title')">
            <Environments />
          </SmartTab>
        </SmartTabs>
      </aside>
    </Pane>
  </Splitpanes>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
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
  setRESTHeaders,
  setRESTParams,
  updateRESTMethod,
  setRESTEndpoint,
} from "~/newstore/RESTSession"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "~/helpers/utils/composables"
import { loadRequestFromSync, startRequestSync } from "~/helpers/fb/request"
import { onLoggedIn } from "~/helpers/fb/auth"

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
    if (query.headers && typeof query.headers === "string")
      setRESTHeaders(JSON.parse(query.headers))
    if (query.params && typeof query.params === "string")
      setRESTParams(JSON.parse(query.params))
    if (query.method && typeof query.method === "string")
      updateRESTMethod(query.method)
    if (query.endpoint && typeof query.endpoint === "string")
      setRESTEndpoint(query.endpoint)
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
      if (request) setRESTRequest(request)
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
    }
  },
})
</script>
