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
    >
      <GqlDocExplorer />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="isGQLTab"
      :id="'schema'"
      :icon="IconBox"
      :label="`${t('tab.schema')}`"
    >
      <div
        v-if="schemaString"
        class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("graphql.schema") }}
        </label>
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/documentation/protocols/graphql"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': WRAP_LINES }"
            :icon="IconWrapText"
            @click.prevent="toggleNestedSetting('WRAP_LINES', 'graphqlSchema')"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :icon="downloadSchemaIcon"
            @click="downloadSchema"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copySchemaIcon"
            @click="copySchema"
          />
        </div>
      </div>
      <div v-if="schemaString" class="h-full relative w-full">
        <div ref="schemaEditor" class="absolute inset-0"></div>
      </div>
      <HoppSmartPlaceholder
        v-else
        :src="`/images/states/${colorMode.value}/blockchain.svg`"
        :alt="`${t('empty.schema')}`"
        :text="t('empty.schema')"
      >
      </HoppSmartPlaceholder>
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
      <History :page="'rest'" :selected-tab="selectedNavigationTab" />
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
import { useCodemirror } from "@composables/codemirror"
import IconBookOpen from "~icons/lucide/book-open"
import IconBox from "~icons/lucide/box"
import IconCheck from "~icons/lucide/check"
import IconClock from "~icons/lucide/clock"
import IconCopy from "~icons/lucide/copy"
import IconDownload from "~icons/lucide/download"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconLayers from "~icons/lucide/layers"
import IconFolder from "~icons/lucide/folder"
import IconShare2 from "~icons/lucide/share-2"
import IconCode from "~icons/lucide/code"
import IconServer from "~icons/lucide/server"
import IconWrapText from "~icons/lucide/wrap-text"
import { computed, reactive, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { refAutoReset } from "@vueuse/core"
import { useService } from "dioc/vue"
import MockServerDashboard from "~/components/mockServer/MockServerDashboard.vue"
import { useNestedSetting } from "~/composables/settings"
import { useMockServerWorkspaceSync } from "~/composables/mockServerWorkspace"
import { useMockServerVisibility } from "~/composables/mockServerVisibility"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { toggleNestedSetting } from "~/newstore/settings"
import { platform } from "~/platform"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

const tabs = useService(WorkspaceTabsService)
const gqlTabConn = useService(GQLTabConnectionService)

const schemaString = gqlTabConn.activeTabSchemaString

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

// GQL Schema sidebar
const downloadSchemaIcon = refAutoReset<typeof IconDownload | typeof IconCheck>(
  IconDownload,
  1000
)
const copySchemaIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const schemaEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "graphqlSchema")

useCodemirror(
  schemaEditor,
  schemaString,
  reactive({
    extendedEditorConfig: {
      mode: "graphql",
      readOnly: true,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const downloadSchema = async () => {
  const dataToWrite = schemaString.value
  const file = new Blob([dataToWrite], { type: "application/graphql" })
  const url = URL.createObjectURL(file)

  const filename = `${
    url.split("/").pop()!.split("#")[0].split("?")[0]
  }.graphql`

  URL.revokeObjectURL(url)

  const result = await platform.kernelIO.saveFileWithDialog({
    data: dataToWrite,
    contentType: "application/graphql",
    suggestedFilename: filename,
    filters: [
      {
        name: "GraphQL Schema File",
        extensions: ["graphql"],
      },
    ],
  })

  if (result.type === "unknown" || result.type === "saved") {
    downloadSchemaIcon.value = IconCheck
    toast.success(`${t("state.download_started")}`)
  }
}

const copySchema = () => {
  if (!schemaString.value) return

  copyToClipboard(schemaString.value)
  copySchemaIcon.value = IconCheck
}

// Ensure mock servers are kept in sync with workspace changes globally
useMockServerWorkspaceSync()
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-sidebarPrimaryStickyFold #{!important};
}
</style>
