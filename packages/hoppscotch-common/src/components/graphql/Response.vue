<template>
  <div class="flex flex-col flex-1 overflow-auto whitespace-nowrap">
    <div
      v-if="
        response && response.length === 1 && response[0].type === 'response'
      "
      class="flex flex-col flex-1"
    >
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("response.title") }}
        </label>
        <div class="flex items-center">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': linewrapEnabled }"
            :icon="IconWrapText"
            @click.prevent="linewrapEnabled = !linewrapEnabled"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.download_file'
            )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
            :icon="downloadResponseIcon"
            @click="downloadResponse"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.copy'
            )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
            :icon="copyResponseIcon"
            @click="copyResponse(response[0].data)"
          />
        </div>
      </div>
      <div ref="schemaEditor" class="flex flex-1 flex-col"></div>
    </div>
    <component
      :is="response[0].error.component"
      v-else-if="
        response && response[0].type === 'error' && response[0].error.component
      "
      class="flex-1"
    />
    <div
      v-else-if="response && response?.length > 1"
      class="flex flex-1 flex-col"
    >
      <GraphqlSubscriptionLog :log="response" />
    </div>
    <AppShortcutsPrompt v-else class="p-4" />
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconDownload from "~icons/lucide/download"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import { computed, reactive, ref } from "vue"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { GQLResponseEvent } from "~/helpers/graphql/connection"
import { platform } from "~/platform"

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    response: GQLResponseEvent[] | null
  }>(),
  {
    response: null,
  }
)

const responseString = computed(() => {
  const response = props.response
  if (response && response[0].type === "error") {
    return ""
  } else if (
    response &&
    response.length === 1 &&
    response[0].type === "response" &&
    response[0].data
  ) {
    return JSON.stringify(JSON.parse(response[0].data), null, 2)
  }
  return ""
})

const schemaEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  schemaEditor,
  responseString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const downloadResponseIcon = refAutoReset<
  typeof IconDownload | typeof IconCheck
>(IconDownload, 1000)
const copyResponseIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyResponse = (str: string) => {
  copyToClipboard(str)
  copyResponseIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const downloadResponse = async (str: string) => {
  const dataToWrite = str
  const file = new Blob([dataToWrite!], { type: "application/json" })
  const url = URL.createObjectURL(file)

  const filename = `${url.split("/").pop()!.split("#")[0].split("?")[0]}.json`

  URL.revokeObjectURL(url)

  const result = await platform.io.saveFileWithDialog({
    data: dataToWrite,
    contentType: "application/json",
    suggestedFilename: filename,
    filters: [
      {
        name: "JSON file",
        extensions: ["json"],
      },
    ],
  })

  if (result.type === "unknown" || result.type === "saved") {
    downloadResponseIcon.value = IconCheck
    toast.success(`${t("state.download_started")}`)
  }
}

defineActionHandler(
  "response.file.download",
  () => downloadResponse(responseString.value),
  computed(() => !!props.response && props.response.length > 0)
)
defineActionHandler(
  "response.copy",
  () => copyResponse(responseString.value),
  computed(() => !!props.response && props.response.length > 0)
)
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-sidebarPrimaryStickyFold #{!important};
}
</style>
