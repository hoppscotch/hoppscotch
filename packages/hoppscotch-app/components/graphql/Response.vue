<template>
  <div>
    <div
      v-if="responseString === 'loading'"
      class="flex flex-col items-center justify-center p-4"
    >
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ t("state.loading") }}</span>
    </div>
    <div v-else-if="responseString">
      <div
        class="sticky top-0 z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight"
      >
        <label class="font-semibold text-secondaryLight">
          {{ t("response.title") }}
        </label>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': linewrapEnabled }"
            svg="wrap-text"
            @click.native.prevent="linewrapEnabled = !linewrapEnabled"
          />
          <ButtonSecondary
            ref="downloadResponse"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :svg="downloadResponseIcon"
            @click.native="downloadResponse"
          />
          <ButtonSecondary
            ref="copyResponseButton"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :svg="copyResponseIcon"
            @click.native="copyResponse"
          />
        </div>
      </div>
      <div ref="schemaEditor"></div>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center flex-1 p-4 text-secondaryLight"
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
            <span class="shortcut-key">/</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">?</span>
          </div>
        </div>
      </div>
      <ButtonSecondary
        :label="`${t('app.documentation')}`"
        to="https://docs.hoppscotch.io/features/response"
        svg="external-link"
        blank
        outline
        reverse
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import { gqlResponse$ } from "~/newstore/GQLSession"

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

const downloadResponseIcon = ref("download")
const copyResponseIcon = ref("copy")

const copyResponse = () => {
  copyToClipboard(responseString.value!)
  copyResponseIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyResponseIcon.value = "copy"), 1000)
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
  downloadResponseIcon.value = "check"
  toast.success(`${t("state.download_started")}`)
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadResponseIcon.value = "download"
  }, 1000)
}
</script>
