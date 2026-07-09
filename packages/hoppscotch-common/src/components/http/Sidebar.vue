<template>
  <HoppSmartTabs
    v-model="selectedNavigationTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <!-- GQL-specific tabs: Docs and Schema (shown when GQL tab is active) -->
    <HoppSmartTab
      v-if="isGQLTab"
      :id="'docs'"
      :icon="IconBookOpen"
      :label="`${t('tab.documentation')}`"
      :order="-2"
    >
      <GqlDocExplorer :key="activeGQLTabId" />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="isGQLTab"
      :id="'schema'"
      :icon="IconBox"
      :label="`${t('tab.schema')}`"
      :order="-1"
    >
      <GqlSchema :key="activeGQLTabId" />
    </HoppSmartTab>

    <!-- Standard REST sidebar tabs -->
    <HoppSmartTab
      :id="'collections'"
      :icon="IconFolder"
      :label="`${t('tab.collections')}`"
    >
      <Collections />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'env'"
      :icon="IconLayers"
      :label="`${t('tab.environments')}`"
    >
      <Environments />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'history'"
      :icon="IconClock"
      :label="`${t('tab.history')}`"
    >
      <History
        :page="'unified-workspace'"
        :selected-tab="selectedNavigationTab"
      />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'share-request'"
      :icon="IconShare2"
      :label="`${t('tab.shared_requests')}`"
    >
      <Share />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="!isGQLTab"
      :id="'codegen'"
      :icon="IconCode"
      :label="`${t('tab.codegen')}`"
    >
      <div
        class="flex items-center overflow-x-auto whitespace-nowrap border-b border-dividerLight px-4 py-2 text-tiny text-secondaryLight"
      >
        <span class="truncate"> {{ t("request.title") }} </span>
        <icon-lucide-chevron-right class="mx-2" />
        {{ t("tab.code_snippet") }}
      </div>
      <HttpCodegen
        v-if="selectedNavigationTab === 'codegen'"
        :hide-label="true"
        class="px-4 mt-4"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="isMockServerVisible"
      :id="'mock-servers'"
      :icon="IconServer"
      :label="`${t('tab.mock_servers')}`"
    >
      <div
        class="flex items-center overflow-x-auto whitespace-nowrap border-b border-dividerLight px-4 py-2 text-tiny text-secondaryLight"
      >
        <span class="truncate"> {{ t("tab.mock_servers") }} </span>
      </div>
      <MockServerDashboard v-if="selectedNavigationTab === 'mock-servers'" />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import IconBookOpen from "~icons/lucide/book-open"
import IconBox from "~icons/lucide/box"
import IconClock from "~icons/lucide/clock"
import IconLayers from "~icons/lucide/layers"
import IconFolder from "~icons/lucide/folder"
import IconShare2 from "~icons/lucide/share-2"
import IconCode from "~icons/lucide/code"
import IconServer from "~icons/lucide/server"
import { computed, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import MockServerDashboard from "~/components/mockServer/MockServerDashboard.vue"
import { useMockServerWorkspaceSync } from "~/composables/mockServerWorkspace"
import { useMockServerVisibility } from "~/composables/mockServerVisibility"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"

const t = useI18n()

const tabs = useService(WorkspaceTabsService)
const gqlTabConn = useService(GQLTabConnectionService)

const activeGQLTabId = gqlTabConn.activeGQLTabId

const { isMockServerVisible } = useMockServerVisibility()

const isGQLTab = computed(
  () => tabs.currentActiveTab.value?.document.type === "gql-request"
)

type RequestOptionTabs =
  | "docs"
  | "schema"
  | "history"
  | "collections"
  | "env"
  | "share-request"
  | "codegen"
  | "mock-servers"

const selectedNavigationTab = ref<RequestOptionTabs>("collections")

// GQL-only and HTTP-only sidebar tab IDs — used to reset when tab type changes
const gqlOnlyTabs: RequestOptionTabs[] = ["docs", "schema"]
const httpOnlyTabs: RequestOptionTabs[] = ["codegen"]

// When switching between HTTP ↔ GQL tabs, reset sidebar selection if current
// selection belongs to the other tab type (preventing stale/invisible tab state)
watch(isGQLTab, (nowGQL) => {
  if (nowGQL && httpOnlyTabs.includes(selectedNavigationTab.value)) {
    selectedNavigationTab.value = "collections"
  } else if (!nowGQL && gqlOnlyTabs.includes(selectedNavigationTab.value)) {
    selectedNavigationTab.value = "collections"
  }
})

// Ensure mock servers are kept in sync with workspace changes globally
useMockServerWorkspaceSync()
</script>
