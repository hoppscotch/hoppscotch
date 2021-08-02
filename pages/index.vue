<template>
  <!-- eslint-disable -->
  <div>
    <Splitpanes :dbl-click-splitter="false" vertical>
      <Pane class="hide-scrollbar !overflow-auto">
        <Splitpanes :dbl-click-splitter="false" horizontal>
          <Pane class="hide-scrollbar !overflow-auto">
            <HttpRequest />
            <SmartTabs styles="sticky top-16 z-10">
              <SmartTab
                :id="'params'"
                :label="$t('parameters')"
                :selected="true"
                :info="newActiveParamsCount$"
              >
                <HttpParameters />
              </SmartTab>

              <SmartTab :id="'bodyParams'" :label="$t('body')" info="0">
                <HttpBody />
              </SmartTab>

              <SmartTab
                :id="'headers'"
                :label="$t('headers')"
                :info="newActiveHeadersCount$"
              >
                <HttpHeaders />
              </SmartTab>

              <SmartTab :id="'authentication'" :label="$t('authentication')">
                <!-- TODO: Implement -->
              </SmartTab>

              <SmartTab
                :id="'pre_request_script'"
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
              <History :page="'rest'" ref="historyComponent" />
            </SmartTab>

            <SmartTab :id="'collections'" :label="$t('collections')">
              <Collections />
            </SmartTab>

            <SmartTab :id="'env'" :label="$t('environments')">
              <Environments />
            </SmartTab>
          </SmartTabs>
        </aside>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"

import { map } from "rxjs/operators"
import { useSetting } from "~/newstore/settings"
import {
  restRequest$,
  restActiveParamsCount$,
  restActiveHeadersCount$,
} from "~/newstore/RESTSession"
import {
  useReadonlyStream,
  useStreamSubscriber,
} from "~/helpers/utils/composables"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    const { subscribeToStream } = useStreamSubscriber()

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
      SCROLL_INTO_ENABLED: useSetting("SCROLL_INTO_ENABLED"),
      PROXY_ENABLED: useSetting("PROXY_ENABLED"),
      URL_EXCLUDES: useSetting("URL_EXCLUDES"),
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
    }
  },
})
</script>
