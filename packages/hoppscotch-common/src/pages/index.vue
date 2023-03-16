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
              class="font-semibold truncate text-tiny w-10 mr-2 truncate"
              :class="getMethodLabelColorClassOf(tab.document.request)"
            >
              {{ tab.document.request.method }}
            </span>
            {{ tab.document.isDirty ? "•" : "" }}
            {{ tab.document.request.name }}
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
</template>

<script lang="ts" setup>
import { onMounted } from "vue"
import { safelyExtractRESTRequest } from "@hoppscotch/data"
import { translateExtURLParams } from "~/helpers/RESTExtURLParams"
import { useRoute } from "vue-router"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import {
  closeTab,
  createNewTab,
  currentActiveTab,
  currentTabID,
  getActiveTabs,
  HoppRESTTab,
  updateTab,
  updateTabOrdering,
} from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

const tabs = getActiveTabs()

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
  closeTab(tabID)
}

bindRequestToURLParams()
// oAuthURL()
</script>
