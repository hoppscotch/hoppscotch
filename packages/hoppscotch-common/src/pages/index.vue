<template>
  <AppPaneLayout layout-id="http">
    <template #primary>
      <HoppSmartWindows
        v-if="currentTabID"
        :id="'rest_windows'"
        v-model="currentTabID"
        @remove-tab="removeTab"
        @add-tab="addNewTab"
        @sort="sortTabs"
      >
        <HoppSmartWindow
          v-for="tab in tabs"
          :id="tab.id"
          :key="tab.id"
          :label="tab.document.request.name"
          :is-removable="tabs.length > 1"
        >
          <template #tabhead>
            <span
              class="font-semibold truncate text-tiny w-10"
              :class="getMethodLabelColorClassOf(tab.document.request)"
            >
              {{ tab.document.request.method }}
            </span>
            <span class="text-green-600 mr-1" v-if="tab.document.isDirty">
              •
            </span>
            <span class="truncate flex-1">
              {{ tab.document.request.name }}
            </span>
          </template>

          <HttpRequestTab
            :model-value="tab"
            @update:model-value="onTabUpdate"
          />
        </HoppSmartWindow>
      </HoppSmartWindows>
    </template>
    <template #sidebar>
      <HttpSidebar />
    </template>
  </AppPaneLayout>
  <HoppSmartConfirmModal
    :show="confirmingCloseFortabID !== null"
    :confirm="t('modal.close_unsaved_tab')"
    :title="t('confirm.save_unsaved_tab')"
    @hide-modal="onCloseConfirmSaveTab"
    @resolve="onResolveConfirmSaveTab"
  />
  <CollectionsSaveRequest
    :show="savingRequest"
    :mode="'rest'"
    @hide-modal="onSaveModalClose"
  />
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
import { safelyExtractRESTRequest } from "@hoppscotch/data"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import { useRoute } from "vue-router"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { useI18n } from "@composables/i18n"
import {
  closeTab,
  createNewTab,
  currentActiveTab,
  currentTabID,
  getActiveTabs,
  getTabRef,
  HoppRESTTab,
  loadTabsFromPersistedState,
  updateTab,
  updateTabOrdering,
} from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { invokeAction } from "~/helpers/actions"
import { onLoggedIn } from "~/composables/auth"
import { platform } from "~/platform"
import { Subscription } from "rxjs"
import { useToast } from "~/composables/toast"
import { PersistableRESTTabState } from "~/helpers/rest/tab"

const savingRequest = ref(false)
const confirmingCloseFortabID = ref<string | null>(null)

const t = useI18n()
const toast = useToast()

const tabs = getActiveTabs()

const confirmSync = ref(false)
const tabStateForSync = ref<PersistableRESTTabState | null>(null)

function bindRequestToURLParams() {
  const route = useRoute()
  // Get URL parameters and set that as the request
  onMounted(() => {
    const query = route.query
    // If query params are empty, or contains code or error param (these are from Oauth Redirect)
    // We skip URL params parsing
    if (Object.keys(query).length === 0 || query.code || query.error) return
    currentActiveTab.value.document.request = safelyExtractRESTRequest(
      translateExtURLParams(query),
      getDefaultRESTRequest()
    )
  })
}

const onTabUpdate = (tab: HoppRESTTab) => {
  updateTab(tab)
}

const addNewTab = () => {
  const tab = createNewTab({
    request: getDefaultRESTRequest(),
    isDirty: false,
  })

  currentTabID.value = tab.id
}
const sortTabs = (e: { oldIndex: number; newIndex: number }) => {
  updateTabOrdering(e.oldIndex, e.newIndex)
}

const removeTab = (tabID: string) => {
  const tab = getTabRef(tabID)

  if (tab.value.document.isDirty) {
    confirmingCloseFortabID.value = tabID
  } else {
    closeTab(tab.value.id)
  }
}

/**
 * This function is closed when the confirm tab is closed by some means (even saving triggers close)
 */
const onCloseConfirmSaveTab = () => {
  if (!savingRequest.value && confirmingCloseFortabID.value) {
    closeTab(confirmingCloseFortabID.value)
    confirmingCloseFortabID.value = null
  }
}

/**
 * Called when the user confirms they want to save the tab
 */
const onResolveConfirmSaveTab = () => {
  if (currentActiveTab.value.document.saveContext) {
    invokeAction("request.save")

    if (confirmingCloseFortabID.value) {
      closeTab(confirmingCloseFortabID.value)
      confirmingCloseFortabID.value = null
    }
  } else {
    savingRequest.value = true
  }
}

/**
 * Called when the Save Request modal is done and is closed
 */
const onSaveModalClose = () => {
  savingRequest.value = false
  if (confirmingCloseFortabID.value) {
    closeTab(confirmingCloseFortabID.value)
    confirmingCloseFortabID.value = null
  }
}

watch(confirmSync, (newValue) => {
  if (newValue) {
    toast.show(`${t("confirm.sync")}`, {
      duration: 0,
      action: [
        {
          text: `${t("action.yes")}`,
          onClick: (_, toastObject) => {
            syncTabState()
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

const syncTabState = () => {
  if (tabStateForSync.value) loadTabsFromPersistedState(tabStateForSync.value)
}

function setupTabStateSync() {
  const route = useRoute()

  // Subscription to request sync
  let sub: Subscription | null = null

  // Load request on login resolve and start sync
  onLoggedIn(async () => {
    if (
      Object.keys(route.query).length === 0 &&
      !(route.query.code || route.query.error)
    ) {
      const tabStateFromSync =
        await platform.sync.tabState.loadTabStateFromSync()

      console.log("TABSTATE FROM SYNC", tabStateFromSync)

      if (tabStateFromSync) {
        tabStateForSync.value = tabStateFromSync
        confirmSync.value = true
      }
    }

    // sub = startRequestSync()
  })

  // Stop subscription to stop syncing
  onBeforeUnmount(() => {
    sub?.unsubscribe()
  })
}

setupTabStateSync()

bindRequestToURLParams()
// oAuthURL()
</script>
