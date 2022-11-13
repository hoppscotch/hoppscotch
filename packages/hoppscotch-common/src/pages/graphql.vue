<template>
  <AppPaneLayout layout-id="graphql">
    <template #primary>
      <SmartWindows
        v-if="currentTabId"
        :id="'communication_tab'"
        v-model="currentTabId"
        @remove-tab="removeTab"
        @add-tab="addNewTab"
        @sort="sortTabs"
      >
        <template v-for="tab in tabs" :key="'removable_tab_' + tab.id">
          <SmartWindow
            :id="tab.id"
            :label="tab.request.getName()"
            :is-removable="tabs.length > 1"
            class="flex flex-col flex-1 overflow-y-auto"
          >
            <template v-if="tab.unseen" #suffix>
              <span
                class="w-1 h-1 ml-auto rounded-full bg-accentLight mr-2"
              ></span>
            </template>

            <AppPaneLayout layout-id="gql-primary">
              <template #primary>
                <GraphqlRequest :conn="tab.connection" :request="tab.request" />
                <GraphqlRequestOptions
                  :tab-id="tab.id"
                  :conn="tab.connection"
                  :request="tab.request"
                />
              </template>
              <template #secondary>
                <GraphqlResponse :request="tab.request" />
              </template>
            </AppPaneLayout>
          </SmartWindow>
        </template>
      </SmartWindows>
    </template>

    <template #sidebar>
      <GraphqlSidebar
        :conn="currentTab.connection"
        :request="currentTab.request"
      />
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
} from "~/newstore/GQLSession"

const t = useI18n()

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

const currentTab = useReadonlyStream(gqlCurrentTab$)
const isLoading = useReadonlyStream(
  currentTab.value.connection.isLoading$,
  false
)

const currentTabId = useStream(GQLCurrentTabId$, "", setCurrentTabId)
const tabs = useStream(GQLTabs$, [], setGQLTabs)
watch(currentTabId, (tabID) => {
  console.log("currentTabId", tabID)
  setResponseUnseen(tabID, false)
})

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
  console.log("removetab", tabID)
  tabs.value = tabs.value.filter((tab) => tab.id !== tabID)
}

watch(isLoading, () => {
  if (isLoading.value) startPageProgress()
  else completePageProgress()
})

onBeforeUnmount(() => {
  if (currentTab.value.connection.connected$.value) {
    currentTab.value.connection.disconnect()
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
