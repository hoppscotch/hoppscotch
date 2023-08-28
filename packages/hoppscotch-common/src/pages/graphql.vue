<template>
  <div>
    <AppPaneLayout layout-id="graphql">
      <template #primary>
        <GraphqlRequest />

        <HoppSmartWindows
          v-if="currentTabID"
          :id="'gql_windows'"
          v-model="currentTabID"
          @remove-tab="removeTab"
          @add-tab="addNewTab"
          @sort="sortTabs"
        >
          <HoppSmartWindow
            v-for="tab in tabs"
            :id="tab.id"
            :key="'removable_tab_' + tab.id"
            :label="tab.document.request.name"
            :is-removable="tabs.length > 1"
            :close-visibility="'hover'"
          >
            <template #tabhead>
              <GraphqlTabHead
                :tab="tab"
                :is-removable="tabs.length > 1"
                @open-rename-modal="openReqRenameModal(tab)"
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

            <GraphqlRequestTab
              :model-value="tab"
              @update:model-value="onTabUpdate"
            />
          </HoppSmartWindow>
        </HoppSmartWindows>
      </template>
      <template #sidebar>
        <GraphqlSidebar />
      </template>
    </AppPaneLayout>
    <CollectionsEditRequest
      v-model="editReqModalReqName"
      :show="showRenamingReqNameModalForTabID !== undefined"
      @submit="renameReqName"
      @hide-modal="showRenamingReqNameModalForTabID = undefined"
    />
    <HoppSmartConfirmModal
      :show="confirmingCloseForTabID !== null"
      :confirm="t('modal.close_unsaved_tab')"
      :title="t('confirm.close_unsaved_tab')"
      @hide-modal="onCloseConfirm"
      @resolve="onResolveConfirm"
    />
    <HoppSmartConfirmModal
      :show="confirmingCloseAllTabs"
      :confirm="t('modal.close_unsaved_tab')"
      :title="t('confirm.close_unsaved_tabs', { count: unsavedTabsCount })"
      @hide-modal="confirmingCloseAllTabs = false"
      @resolve="onResolveConfirmCloseAllTabs"
    />
  </div>
</template>

<script setup lang="ts">
import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { computed, onBeforeUnmount, ref } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { connection, disconnect } from "~/helpers/graphql/connection"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import {
  HoppGQLTab,
  closeOtherTabs,
  closeTab,
  createNewTab,
  currentTabID,
  getActiveTabs,
  getDirtyTabsCount,
  getTabRef,
  updateTab,
  updateTabOrdering,
} from "~/helpers/graphql/tab"
import { InspectionService } from "~/services/inspection"

const t = useI18n()

const inspectionService = useService(InspectionService)

const confirmingCloseForTabID = ref<string | null>(null)

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

const tabs = getActiveTabs()

const addNewTab = () => {
  const tab = createNewTab({
    request: getDefaultGQLRequest(),
    isDirty: false,
  })

  currentTabID.value = tab.id
}
const sortTabs = (e: { oldIndex: number; newIndex: number }) => {
  updateTabOrdering(e.oldIndex, e.newIndex)
}

const removeTab = (tabID: string) => {
  const tabState = getTabRef(tabID).value

  if (tabState.document.isDirty) {
    confirmingCloseForTabID.value = tabID
  } else {
    closeTab(tabState.id)
    inspectionService.deleteTabInspectorResult(tabState.id)
  }
}

/**
 * This function is closed when the confirm tab is closed by some means (even saving triggers close)
 */
const onCloseConfirm = () => {
  confirmingCloseForTabID.value = null
}

/**
 * Called when the user confirms they want to save the tab
 */
const onResolveConfirm = () => {
  if (confirmingCloseForTabID.value) {
    closeTab(confirmingCloseForTabID.value)
    confirmingCloseForTabID.value = null
  }
}

const confirmingCloseAllTabs = ref(false)
const unsavedTabsCount = ref(0)
const exceptedTabID = ref<string | null>(null)

const closeOtherTabsAction = (tabID: string) => {
  const dirtyTabCount = getDirtyTabsCount()
  // If there are dirty tabs, show the confirm modal
  if (dirtyTabCount > 0) {
    confirmingCloseAllTabs.value = true
    unsavedTabsCount.value = dirtyTabCount
    exceptedTabID.value = tabID
  } else {
    closeOtherTabs(tabID)
  }
}

const onResolveConfirmCloseAllTabs = () => {
  if (exceptedTabID.value) closeOtherTabs(exceptedTabID.value)
  confirmingCloseAllTabs.value = false
}

const onTabUpdate = (tab: HoppGQLTab) => {
  updateTab(tab)
}

onBeforeUnmount(() => {
  if (connection.state === "CONNECTED") {
    disconnect()
  }
})

const editReqModalReqName = ref("")
const showRenamingReqNameModalForTabID = ref<string>()

const openReqRenameModal = (tab: HoppGQLTab) => {
  editReqModalReqName.value = tab.document.request.name
  showRenamingReqNameModalForTabID.value = tab.id
}

const renameReqName = () => {
  const tab = getTabRef(showRenamingReqNameModalForTabID.value!)
  if (tab.value) {
    tab.value.document.request.name = editReqModalReqName.value
    updateTab(tab.value)
  }
  showRenamingReqNameModalForTabID.value = undefined
}

const duplicateTab = (tabID: string) => {
  const tab = getTabRef(tabID)
  if (tab.value) {
    const newTab = createNewTab({
      request: tab.value.document.request,
      isDirty: true,
    })
    currentTabID.value = newTab.id
  }
}

defineActionHandler("gql.request.open", ({ request, saveContext }) => {
  createNewTab({
    saveContext,
    request: request,
    isDirty: false,
  })
})

defineActionHandler("request.rename", () => {
  openReqRenameModal(getTabRef(currentTabID.value).value!)
})

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
</script>
