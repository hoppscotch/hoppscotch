<template>
  <div class="flex flex-col flex-1 overflow-auto whitespace-nowrap">
    <div
      v-if="responseString === 'loading'"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div v-else-if="responseString" class="flex flex-col flex-1">
      <div
        class="sticky top-0 z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
      >
        <label class="font-semibold text-secondaryLight">
          {{ t("response.title") }}
        </label>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': linewrapEnabled }"
            :icon="IconWrapText"
            @click.prevent="linewrapEnabled = !linewrapEnabled"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.download_file'
            )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
            :icon="downloadResponseIcon"
            @click="downloadResponse"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.copy'
            )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
            :icon="copyResponseIcon"
            @click="copyResponse"
          />
        </div>
      </div>
      <div ref="schemaEditor" class="flex flex-col flex-1"></div>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <div class="flex pb-4 my-4 space-x-2">
        <div class="flex flex-col items-end text-right space-y-4">
          <span class="flex items-center flex-1">
            {{ t("shortcut.general.command_menu") }}
          </span>
          <span class="flex items-center flex-1">
            {{ t("shortcut.general.help_menu") }}
          </span>
        </div>
        <div class="flex flex-col space-y-4">
          <div class="flex">
            <kbd class="shortcut-key">/</kbd>
          </div>
          <div class="flex">
            <kbd class="shortcut-key">?</kbd>
          </div>
        </div>
      </div>
      <ButtonSecondary
        :label="`${t('app.documentation')}`"
        to="https://docs.hoppscotch.io/features/response"
        :icon="IconExternalLink"
        blank
        outline
        reverse
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconExternalLink from "~icons/lucide/external-link"
import IconDownload from "~icons/lucide/download"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import { reactive, ref } from "vue"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { gqlResponse$ } from "~/newstore/GQLSession"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"

const t = useI18n()

const toast = useToast()

const responseString = useReadonlyStream(gqlResponse$, "")

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

const copyResponse = () => {
  copyToClipboard(responseString.value!)
  copyResponseIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const downloadResponse = () => {
  const dataToWrite = responseString.value
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

defineActionHandler("response.file.download", () => downloadResponse())
defineActionHandler("response.copy", () => copyResponse())
</script>
