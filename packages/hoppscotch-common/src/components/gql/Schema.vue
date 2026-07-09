<template>
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
</template>

<script setup lang="ts">
import { reactive, ref } from "vue"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useService } from "dioc/vue"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconDownload from "~icons/lucide/download"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconWrapText from "~icons/lucide/wrap-text"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { platform } from "~/platform"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const gqlTabConn = useService(GQLTabConnectionService)

const schemaString = gqlTabConn.activeTabSchemaString

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
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-sidebarPrimaryStickyFold #{!important};
}
</style>
