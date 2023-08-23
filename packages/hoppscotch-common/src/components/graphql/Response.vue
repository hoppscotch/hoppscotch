<template>
  <div class="flex flex-col flex-1 overflow-auto whitespace-nowrap">
    <div v-if="response?.length === 1" class="flex flex-col flex-1">
      <div
        class="sticky top-0 z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight"
      >
        <label class="font-semibold truncate text-secondaryLight">
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
      <div ref="schemaEditor" class="flex flex-col flex-1"></div>
    </div>
    <div
      v-else-if="response && response?.length > 1"
      class="flex flex-col flex-1"
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
  if (props.response?.length === 1) {
    return JSON.stringify(JSON.parse(props.response[0].data), null, 2)
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

const downloadResponse = (str: string) => {
  const dataToWrite = str
  const file = new Blob([dataToWrite!], { type: "application/json" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}`
  document.body.appendChild(a)
  a.click()
  downloadResponseIcon.value = IconCheck
  toast.success(`${t("state.download_started")}`)
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

defineActionHandler("response.file.download", () =>
  downloadResponse(responseString.value)
)
defineActionHandler("response.copy", () => copyResponse(responseString.value))
</script>
