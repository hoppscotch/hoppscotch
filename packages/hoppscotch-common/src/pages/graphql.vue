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
              <div
                v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
                :title="tab.document.request.name"
                class="truncate px-2"
              >
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

    <HoppSmartConfirmModal
      :show="confirmingCloseForTabID !== null"
      :confirm="t('modal.close_unsaved_tab')"
      :title="t('confirm.close_unsaved_tab')"
      @hide-modal="onCloseConfirm"
      @resolve="onResolveConfirm"
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
  closeTab,
  createNewTab,
  currentTabID,
  getActiveTabs,
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

const onTabUpdate = (tab: HoppGQLTab) => {
  updateTab(tab)
}

onBeforeUnmount(() => {
  if (connection.state === "CONNECTED") {
    disconnect()
  }
})

defineActionHandler("gql.request.open", ({ request }) => {
  createNewTab({
    request: request,
    isDirty: false,
  })
})
</script>
