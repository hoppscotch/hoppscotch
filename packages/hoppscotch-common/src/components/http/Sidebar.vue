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
        :page="isGqlWorkspaceEnabled ? 'unified-workspace' : 'rest'"
        :selected-tab="selectedNavigationTab"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="isRequestBearingTab"
      :id="'share-request'"
      :icon="IconShare2"
      :label="`${t('tab.shared_requests')}`"
    >
      <Share />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="!isGQLTab && isRequestBearingTab"
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
  <!-- Share hosts the app's only `share.request` action handler (and its
       modals). When its sidebar tab is hidden for non-request tabs, keep one
       hidden instance mounted so sharing a request tab from the collections
       tree / tab-head context menu still works (main kept it always mounted
       via render-inactive-tabs). -->
  <div v-if="!isRequestBearingTab" class="hidden">
    <Share />
  </div>
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
import { useGqlWorkspaceVisibility } from "~/composables/gqlWorkspaceVisibility"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"

const t = useI18n()

const tabs = useService(WorkspaceTabsService)
const gqlTabConn = useService(GQLTabConnectionService)

const activeGQLTabId = gqlTabConn.activeGQLTabId

const { isMockServerVisible } = useMockServerVisibility()
const { isGqlWorkspaceEnabled } = useGqlWorkspaceVisibility()

const activeDocType = computed(() => tabs.currentActiveTab.value?.document.type)

const isGQLTab = computed(() => activeDocType.value === "gql-request")

// Share and Codegen operate on the active tab's request — hide them for
// documents that carry no live request (test-runner, saved examples)
const isRequestBearingTab = computed(
  () =>
    activeDocType.value === "request" || activeDocType.value === "gql-request"
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

// GQL-only, HTTP-only, and request-only sidebar tab IDs — used to reset when
// the active tab's document type changes
const gqlOnlyTabs: RequestOptionTabs[] = ["docs", "schema"]
const httpOnlyTabs: RequestOptionTabs[] = ["codegen"]
const requestOnlyTabs: RequestOptionTabs[] = ["share-request", "codegen"]

// When the active document type changes, reset sidebar selection if the
// current selection is no longer visible (preventing stale/invisible tab state)
watch([isGQLTab, isRequestBearingTab], ([nowGQL, requestBearing]) => {
  const selected = selectedNavigationTab.value
  if (
    (nowGQL && httpOnlyTabs.includes(selected)) ||
    (!nowGQL && gqlOnlyTabs.includes(selected)) ||
    (!requestBearing && requestOnlyTabs.includes(selected))
  ) {
    selectedNavigationTab.value = "collections"
  }
})

// Ensure mock servers are kept in sync with workspace changes globally
useMockServerWorkspaceSync()
</script>
