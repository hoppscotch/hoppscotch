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
            :label="tab.name"
            :is-removable="tabs.length > 1"
            class="flex flex-col flex-1 overflow-y-auto"
          >
            <GraphqlRequest :conn="tab.connection" />
            <GraphqlRequestOptions :conn="tab.connection" />
          </SmartWindow>
        </template>
      </SmartWindows>
    </template>
    <template #secondary>
      <GraphqlResponse :conn="gqlConn" />
    </template>
    <template #sidebar>
      <GraphqlSidebar :conn="gqlConn" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { GQLConnection } from "@helpers/GQLConnection"
import {
  GQLTabs$,
  setGQLTabs,
  GQLCurrentTabId$,
  setCurrentTabId,
  addNewGQLTab,
} from "~/newstore/GQLSession"

const t = useI18n()

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

const gqlConn = new GQLConnection()
const isLoading = useReadonlyStream(gqlConn.isLoading$, false)

const currentTabId = useStream(GQLCurrentTabId$, "", setCurrentTabId)
const tabs = useStream(GQLTabs$, [], setGQLTabs)
watch(currentTabId, (tabID) => {
  console.log("currentTabId", tabID)
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
  if (gqlConn.connected$.value) {
    gqlConn.disconnect()
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
