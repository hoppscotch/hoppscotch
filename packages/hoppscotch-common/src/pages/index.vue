<template>
  <div>
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
            :close-visibility="'hover'"
          >
            <template #tabhead>
              <HttpTabHead
                :tab="tab"
                :is-removable="tabs.length > 1"
                @open-rename-modal="openReqRenameModal(tab.id)"
                @close-tab="removeTab(tab.id)"
                @close-other-tabs="closeOtherTabsAction(tab.id)"
                @duplicate-tab="duplicateTab(tab.id)"
              />
            </template>
            <template #suffix>
              <span
                v-if="tab.document.isDirty"
                class="flex items-center justify-center text-secondary group-hover:hidden w-4"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="1.2em"
                  height="1.2em"
                  class="h-1.5 w-1.5"
                >
                  <circle cx="12" cy="12" r="12" fill="currentColor"></circle>
                </svg>
              </span>
            </template>
            <HttpRequestTab
              :model-value="tab"
              @update:model-value="onTabUpdate"
            />
          </HoppSmartWindow>
          <template #actions>
            <EnvironmentsSelector class="h-full" />
          </template>
        </HoppSmartWindows>
      </template>
      <template #sidebar>
        <HttpSidebar />
      </template>
    </AppPaneLayout>
    <CollectionsEditRequest
      v-model="reqName"
      :show="showRenamingReqNameModal"
      @submit="renameReqName"
      @hide-modal="showRenamingReqNameModal = false"
    />
    <HoppSmartConfirmModal
      :show="confirmingCloseForTabID !== null"
      :confirm="t('modal.close_unsaved_tab')"
      :title="t('confirm.save_unsaved_tab')"
      @hide-modal="onCloseConfirmSaveTab"
      @resolve="onResolveConfirmSaveTab"
    />
    <HoppSmartConfirmModal
      :show="confirmingCloseAllTabs"
      :confirm="t('modal.close_unsaved_tab')"
      :title="t('confirm.close_unsaved_tabs', { count: unsavedTabsCount })"
      @hide-modal="confirmingCloseAllTabs = false"
      @resolve="onResolveConfirmCloseAllTabs"
    />
    <CollectionsSaveRequest
      v-if="savingRequest"
      mode="rest"
      :show="savingRequest"
      @hide-modal="onSaveModalClose"
    />
    <AppContextMenu
      v-if="contextMenu.show"
      :show="contextMenu.show"
      :position="contextMenu.position"
      :text="contextMenu.text"
      @hide-modal="contextMenu.show = false"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, onBeforeMount } from "vue"
import { safelyExtractRESTRequest } from "@hoppscotch/data"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import { useRoute } from "vue-router"
import { useI18n } from "@composables/i18n"
import {
  closeTab,
  closeOtherTabs,
  createNewTab,
  currentActiveTab,
  currentTabID,
  getActiveTabs,
  getTabRef,
  HoppRESTTab,
  loadTabsFromPersistedState,
  persistableTabState,
  updateTab,
  updateTabOrdering,
  getDirtyTabsCount,
} from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { onLoggedIn } from "~/composables/auth"
import { platform } from "~/platform"
import {
  audit,
  BehaviorSubject,
  combineLatest,
  EMPTY,
  from,
  map,
  Subscription,
} from "rxjs"
import { useToast } from "~/composables/toast"
import { PersistableRESTTabState } from "~/helpers/rest/tab"
import { watchDebounced } from "@vueuse/core"
import { oauthRedirect } from "~/helpers/oauth"
import { useReadonlyStream } from "~/composables/stream"
import {
  changeCurrentSyncStatus,
  currentSyncingStatus$,
} from "~/newstore/syncing"
import { useService } from "dioc/vue"
import { InspectionService } from "~/services/inspection"
import { HeaderInspectorService } from "~/services/inspection/inspectors/header.inspector"
import { EnvironmentInspectorService } from "~/services/inspection/inspectors/environment.inspector"
import { ResponseInspectorService } from "~/services/inspection/inspectors/response.inspector"
import { cloneDeep } from "lodash-es"

const savingRequest = ref(false)
const confirmingCloseForTabID = ref<string | null>(null)
const confirmingCloseAllTabs = ref(false)
const showRenamingReqNameModal = ref(false)
const reqName = ref<string>("")
const unsavedTabsCount = ref(0)
const exceptedTabID = ref<string | null>(null)
const renameTabID = ref<string | null>(null)

const t = useI18n()
const toast = useToast()

type PopupDetails = {
  show: boolean
  position: {
    top: number
    left: number
  }
  text: string | null
}

const contextMenu = ref<PopupDetails>({
  show: false,
  position: {
    top: 0,
    left: 0,
  },
  text: null,
})

const tabs = getActiveTabs()

const confirmSync = useReadonlyStream(currentSyncingStatus$, {
  isInitialSync: false,
  shouldSync: true,
})
const tabStateForSync = ref<PersistableRESTTabState | null>(null)

function bindRequestToURLParams() {
  const route = useRoute()
  // Get URL parameters and set that as the request
  onMounted(() => {
    const query = route.query
    // If query params are empty, or contains code or error param (these are from Oauth Redirect)
    // We skip URL params parsing
    if (Object.keys(query).length === 0 || query.code || query.error) return

    const request = currentActiveTab.value.document.request

    currentActiveTab.value.document.request = safelyExtractRESTRequest(
      translateExtURLParams(query, request),
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

const inspectionService = useService(InspectionService)

const removeTab = (tabID: string) => {
  const tabState = getTabRef(tabID).value

  if (tabState.document.isDirty) {
    confirmingCloseForTabID.value = tabID
  } else {
    closeTab(tabState.id)
    inspectionService.deleteTabInspectorResult(tabState.id)
  }
}

const closeOtherTabsAction = (tabID: string) => {
  const isTabDirty = getTabRef(tabID).value?.document.isDirty
  const dirtyTabCount = getDirtyTabsCount()
  // If current tab is dirty, so we need to subtract 1 from the dirty tab count
  const balanceDirtyTabCount = isTabDirty ? dirtyTabCount - 1 : dirtyTabCount
  // If there are dirty tabs, show the confirm modal
  if (balanceDirtyTabCount > 0) {
    confirmingCloseAllTabs.value = true
    unsavedTabsCount.value = balanceDirtyTabCount
    exceptedTabID.value = tabID
  } else {
    closeOtherTabs(tabID)
  }
}

const duplicateTab = (tabID: string) => {
  const tab = getTabRef(tabID)
  if (tab.value) {
    const newTab = createNewTab({
      request: cloneDeep(tab.value.document.request),
      isDirty: true,
    })
    currentTabID.value = newTab.id
  }
}

const onResolveConfirmCloseAllTabs = () => {
  if (exceptedTabID.value) closeOtherTabs(exceptedTabID.value)
  confirmingCloseAllTabs.value = false
}

const openReqRenameModal = (tabID?: string) => {
  if (tabID) {
    const tab = getTabRef(tabID)
    reqName.value = tab.value.document.request.name
    renameTabID.value = tabID
  } else {
    reqName.value = currentActiveTab.value.document.request.name
  }
  showRenamingReqNameModal.value = true
}

const renameReqName = () => {
  const tab = getTabRef(renameTabID.value ?? currentTabID.value)
  if (tab.value) {
    tab.value.document.request.name = reqName.value
    updateTab(tab.value)
  }
  showRenamingReqNameModal.value = false
}

/**
 * This function is closed when the confirm tab is closed by some means (even saving triggers close)
 */
const onCloseConfirmSaveTab = () => {
  if (!savingRequest.value && confirmingCloseForTabID.value) {
    closeTab(confirmingCloseForTabID.value)
    inspectionService.deleteTabInspectorResult(confirmingCloseForTabID.value)
    confirmingCloseForTabID.value = null
  }
}

/**
 * Called when the user confirms they want to save the tab
 */
const onResolveConfirmSaveTab = () => {
  if (currentActiveTab.value.document.saveContext) {
    invokeAction("request.save")

    if (confirmingCloseForTabID.value) {
      closeTab(confirmingCloseForTabID.value)
      confirmingCloseForTabID.value = null
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
  if (confirmingCloseForTabID.value) {
    closeTab(confirmingCloseForTabID.value)
    confirmingCloseForTabID.value = null
  }
}

const syncTabState = () => {
  if (tabStateForSync.value) loadTabsFromPersistedState(tabStateForSync.value)
}

/**
 * Performs sync of the REST Tab session with Firestore.
 *
 * @returns A subscription to the sync observable stream.
 * Unsubscribe to stop syncing.
 */
function startTabStateSync(): Subscription {
  const currentUser$ = platform.auth.getCurrentUserStream()
  const tabState$ = new BehaviorSubject<PersistableRESTTabState | null>(null)

  watchDebounced(
    persistableTabState,
    (state) => {
      tabState$.next(state)
    },
    { debounce: 500, deep: true }
  )

  const sub = combineLatest([currentUser$, tabState$])
    .pipe(
      map(([user, tabState]) =>
        user && tabState
          ? from(platform.sync.tabState.writeCurrentTabState(user, tabState))
          : EMPTY
      ),
      audit((x) => x)
    )
    .subscribe(() => {
      // NOTE: This subscription should be kept
    })

  return sub
}

const showSyncToast = () => {
  toast.show(t("confirm.sync"), {
    duration: 0,
    action: [
      {
        text: `${t("action.yes")}`,
        onClick: (_, toastObject) => {
          syncTabState()
          changeCurrentSyncStatus({
            isInitialSync: true,
            shouldSync: true,
          })
          toastObject.goAway(0)
        },
      },
      {
        text: `${t("action.no")}`,
        onClick: (_, toastObject) => {
          changeCurrentSyncStatus({
            isInitialSync: true,
            shouldSync: false,
          })
          toastObject.goAway(0)
        },
      },
    ],
  })
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

      if (tabStateFromSync && !confirmSync.value.isInitialSync) {
        tabStateForSync.value = tabStateFromSync
        showSyncToast()
        // Have to set isInitialSync to true here because the toast is shown
        // and the user does not click on any of the actions
        changeCurrentSyncStatus({
          isInitialSync: true,
          shouldSync: false,
        })
      }
    }

    sub = startTabStateSync()
  })

  // Stop subscription to stop syncing
  onBeforeUnmount(() => {
    sub?.unsubscribe()
  })
}

function oAuthURL() {
  onBeforeMount(async () => {
    try {
      const tokenInfo = await oauthRedirect()
      if (
        typeof tokenInfo === "object" &&
        tokenInfo.hasOwnProperty("access_token")
      ) {
        if (
          currentActiveTab.value.document.request.auth.authType === "oauth-2"
        ) {
          currentActiveTab.value.document.request.auth.token =
            tokenInfo.access_token
        }
      }

      // eslint-disable-next-line no-empty
    } catch (_) {}
  })
}

defineActionHandler("contextmenu.open", ({ position, text }) => {
  if (text) {
    contextMenu.value = {
      show: true,
      position,
      text,
    }
  } else {
    contextMenu.value = {
      show: false,
      position,
      text,
    }
  }
})

setupTabStateSync()
bindRequestToURLParams()
oAuthURL()

defineActionHandler("rest.request.open", ({ doc }) => {
  createNewTab(doc)
})

defineActionHandler("request.rename", openReqRenameModal)
defineActionHandler("tab.duplicate-tab", ({ tabID }) => {
  duplicateTab(tabID ?? currentTabID.value)
})
defineActionHandler("tab.close-current", () => {
  removeTab(currentTabID.value)
})
defineActionHandler("tab.close-other", () => {
  closeOtherTabs(currentTabID.value)
})
defineActionHandler("tab.open-new", addNewTab)

useService(HeaderInspectorService)
useService(EnvironmentInspectorService)
useService(ResponseInspectorService)
for (const inspectorDef of platform.additionalInspectors ?? []) {
  useService(inspectorDef.service)
}
</script>
