<template>
  <AppPaneLayout layout-id="graphql">
    <template #primary>
      <SmartWindows
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
            <GraphqlRequest :conn="gqlConn" />
            <GraphqlRequestOptions :conn="gqlConn" />
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
import { computed, onBeforeUnmount, watch, ref } from "vue"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { GQLConnection } from "@helpers/GQLConnection"
import { uniqueId } from "lodash-es"

const t = useI18n()

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

let gqlConn = new GQLConnection()
const isLoading = useReadonlyStream(gqlConn.isLoading$, false)

const currentTabId = ref("new")
const defaultTab = {
  id: "new",
  name: "Untitled",
  connection: new GQLConnection(),
}
const tabs = ref([defaultTab])

const changeTab = (id: string) => {
  currentTabId.value = id
  const currentTab = tabs.value.find((tab) => tab.id === id)
  if (currentTab) {
    gqlConn = currentTab.connection as GQLConnection
  }
}
const addNewTab = () => {
  tabs.value.push({
    id: uniqueId("new_"),
    name: "Untitled",
    connection: new GQLConnection(),
  })
  changeTab(tabs.value[tabs.value.length - 1].id)
}
const sortTabs = (e: { oldIndex: number; newIndex: number }) => {
  const newTabs = [...tabs.value]
  newTabs.splice(e.newIndex, 0, newTabs.splice(e.oldIndex, 1)[0])
  tabs.value = newTabs
}
const removeTab = (tabID: string) => {
  const index = tabs.value.findIndex((tab) => tab.id === tabID)
  tabs.value.splice(index, 1)
}

watch(isLoading, () => {
  if (isLoading.value) startPageProgress()
  else completePageProgress()
})

watch(currentTabId, () => {
  const tab = tabs.value.find((tab) => tab.id === currentTabId.value)
  if (tab) {
    gqlConn = tab.connection as GQLConnection
  }
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
