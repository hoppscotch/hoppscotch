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
              <div
                v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
                :title="tab.document.request.name"
                class="truncate px-2"
                @dblclick="openReqRenameModal()"
              >
                <span
                  class="font-semibold text-tiny"
                  :class="getMethodLabelColorClassOf(tab.document.request)"
                >
                  {{ tab.document.request.method }}
                </span>
                <span class="leading-8 px-2">
                  {{ tab.document.request.name }}
                </span>
              </div>
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
      :show="showRenamingReqNameModal"
      v-model="reqName"
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
    <CollectionsSaveRequest
      :show="savingRequest"
      :mode="'rest'"
      @hide-modal="onSaveModalClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch, onBeforeMount } from "vue"
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
  persistableTabState,
  updateTab,
  updateTabOrdering,
} from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { invokeAction } from "~/helpers/actions"
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

const savingRequest = ref(false)
const confirmingCloseForTabID = ref<string | null>(null)
const showRenamingReqNameModal = ref(false)
const reqName = ref<string>("")

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
    confirmingCloseForTabID.value = tabID
  } else {
    closeTab(tab.value.id)
  }
}

const openReqRenameModal = () => {
  showRenamingReqNameModal.value = true
  reqName.value = currentActiveTab.value.document.request.name
}

const renameReqName = () => {
  const tab = getTabRef(currentTabID.value)
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

watch(confirmSync, (newValue) => {
  if (newValue) {
    toast.show(t("confirm.sync"), {
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

      if (tabStateFromSync) {
        tabStateForSync.value = tabStateFromSync
        confirmSync.value = true
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

setupTabStateSync()
bindRequestToURLParams()
oAuthURL()
</script>
