<template>
  <AppPaneLayout layout-id="graphql">
    <template #primary>
      <GraphqlRequest :request="currentTab?.request" />

      <SmartWindows
        v-if="currentTabId"
        :id="'communication_tab'"
        v-model="currentTabId"
        @remove-tab="removeTab"
        @add-tab="addNewTab"
        @sort="sortTabs"
      >
        <SmartWindow
          v-for="tab in tabs"
          :id="tab.id"
          :key="'removable_tab_' + tab.id"
          :label="tab.request.name"
          :is-removable="tabs.length > 1"
        >
          <template #suffix>
            <span
              v-if="tabsUnseenState[tab.id]"
              class="w-1 h-1 ml-auto rounded-full bg-accentLight mr-2"
            ></span>
          </template>

          <GraphqlRequestTab
            :model-value="tab"
            @update:model-value="onTabUpdate"
          />
        </SmartWindow>
      </SmartWindows>
    </template>
    <template #sidebar>
      <GraphqlSidebar :request="currentTab.request" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { usePageHead } from "@composables/head"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import {
  GQLTabs$,
  setGQLTabs,
  GQLCurrentTabId$,
  setCurrentTabId,
  addNewGQLTab,
  gqlCurrentTab$,
  setResponseUnseen,
  setGQLConnection,
  GQLConnection$,
  GQLTab,
} from "~/newstore/GQLSession"
import { GQLConnection } from "~/helpers/graphql/GQLConnection"

const t = useI18n()

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

const currentTab = useReadonlyStream(gqlCurrentTab$)

const conn = useStream(GQLConnection$, new GQLConnection(), setGQLConnection)
const isLoading = useReadonlyStream(conn.value.isLoading$, false)

const currentTabId = useStream(GQLCurrentTabId$, "", setCurrentTabId)

const tabs = useStream(GQLTabs$, [], setGQLTabs)
watch(currentTabId, (tabID) => {
  setResponseUnseen(tabID, false)
})

const tabsUnseenState = computed(() =>
  Object.fromEntries(tabs.value.map((tab) => [tab.id, tab.unseen]))
)

const addNewTab = () => {
  addNewGQLTab()
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

const onTabUpdate = (tab: GQLTab) => {
  tabs.value = tabs.value.map((t) => {
    if (t.id === tab.id) {
      return tab
    } else {
      return t
    }
  })

  console.log("ON_TAB_UPDATE", tab)
}

watch(isLoading, () => {
  if (isLoading.value) startPageProgress()
  else completePageProgress()
})

onBeforeUnmount(() => {
  if (conn.value.connected$.value) {
    conn.value.disconnect()
  }
})

defineActionHandler("gql.request.open", ({ request }) => {
  const session = getGQLSession()

  setGQLSession({
    request: cloneDeep(request),
    schema: session.schema,
    response: session.response,
  })
})
</script>
