<template>
  <AppPaneLayout layout-id="http">
    <template #primary>
      <SmartWindows
        v-if="currentTabId"
        :id="'rest_windows'"
        v-model="currentTabId"
        @remove-tab="removeTab"
        @add-tab="addNewTab"
        @sort="sortTabs"
      >
        <SmartWindow
          v-for="tab in tabs"
          :id="tab.id"
          :key="'removable_tab_' + tab.id"
          :label="tab.name"
          :is-removable="tabs.length > 1"
        >
          <HttpRequest />
          <HttpRequestOptions />
        </SmartWindow>
      </SmartWindows>
    </template>
    <template #secondary>
      <HttpResponse />
    </template>
    <template #sidebar>
      <HttpSidebar />
    </template>
  </AppPaneLayout>
</template>

<script lang="ts" setup>
import { onBeforeMount, onBeforeUnmount, onMounted, Ref, ref, watch } from "vue"
import type { Subscription } from "rxjs"
import {
  HoppRESTRequest,
  HoppRESTAuthOAuth2,
  safelyExtractRESTRequest,
  isEqualHoppRESTRequest,
} from "@hoppscotch/data"
import {
  getRESTRequest,
  setRESTRequest,
  setRESTAuth,
  restAuth$,
  getDefaultRESTRequest,
} from "~/newstore/RESTSession"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import { pluckRef } from "@composables/ref"
import { useI18n } from "@composables/i18n"
import { useStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { onLoggedIn } from "@composables/auth"
import { loadRequestFromSync, startRequestSync } from "~/helpers/fb/request"
import { oauthRedirect } from "~/helpers/oauth"
import { useRoute } from "vue-router"

const toast = useToast()
const t = useI18n()

const requestForSync = ref<HoppRESTRequest | null>(null)

const confirmSync = ref(false)

type Tab = {
  id: string
  name: string
  removable: boolean
}

const currentTabId = ref("tab_1")
const tabs = ref<Tab[]>([
  {
    id: "tab_1",
    name: "Tab 1",
    removable: false,
  },
])

function bindRequestToURLParams() {
  const route = useRoute()
  // Get URL parameters and set that as the request
  onMounted(() => {
    const query = route.query
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
    try {
      const tokenInfo = await oauthRedirect()
      if (Object.prototype.hasOwnProperty.call(tokenInfo, "access_token")) {
        if (typeof tokenInfo === "object") {
          oauth2Token.value = tokenInfo.access_token
        }
      }

      // eslint-disable-next-line no-empty
    } catch (_) {}
  })
}

function setupRequestSync(
  confirmSync: Ref<boolean>,
  requestForSync: Ref<HoppRESTRequest | null>
) {
  const route = useRoute()

  // Subscription to request sync
  let sub: Subscription | null = null

  // Load request on login resolve and start sync
  onLoggedIn(async () => {
    if (
      Object.keys(route.query).length === 0 &&
      !(route.query.code || route.query.error)
    ) {
      const request = await loadRequestFromSync()
      if (request) {
        if (!isEqualHoppRESTRequest(request, getRESTRequest())) {
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

const addNewTab = () => {
  tabs.value.push({
    id: `tab_${tabs.value.length + 1}`,
    name: `Tab ${tabs.value.length + 1}`,
    removable: true,
  })
  currentTabId.value = tabs.value[tabs.value.length - 1].id
}

const sortTabs = (e: { oldIndex: number; newIndex: number }) => {
  const newTabs = [...tabs.value]
  newTabs.splice(e.newIndex, 0, newTabs.splice(e.oldIndex, 1)[0])
  tabs.value = newTabs
}

const removeTab = (tabID: string) => {
  tabs.value = tabs.value.filter((tab) => tab.id !== tabID)
}

setupRequestSync(confirmSync, requestForSync)
bindRequestToURLParams()
oAuthURL()
</script>
