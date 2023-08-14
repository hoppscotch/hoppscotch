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
  </div>
</template>

<script setup lang="ts">
import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { computed, onBeforeUnmount } from "vue"
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

// const confirmingCloseForTabID = ref<string | null>(null)
const t = useI18n()

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
  const tab = getTabRef(tabID)
  closeTab(tab.value.id)

  // TODO: Confirm close??
  // if (tab.value.document.isDirty) {
  //   confirmingCloseForTabID.value = tabID
  // } else {
  // }
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
