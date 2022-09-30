<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${t('import.curl')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="px-2 h-46">
        <div
          ref="curlEditor"
          class="h-full border rounded border-dividerLight"
        ></div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          ref="importButton"
          :label="`${t('import.title')}`"
          outline
          @click="handleImport"
        />
        <ButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
      <span class="flex">
        <ButtonSecondary
          :icon="pasteIcon"
          :label="`${t('action.paste')}`"
          filled
          outline
          @click="handlePaste"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { setRESTRequest } from "~/newstore/RESTSession"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { parseCurlToHoppRESTReq } from "~/helpers/curl"

import IconClipboard from "~icons/lucide/clipboard"
import IconCheck from "~icons/lucide/check"

const t = useI18n()

const toast = useToast()

const curl = ref("")

const curlEditor = ref<any | null>(null)

const props = defineProps<{ show: boolean; text: string }>()

useCodemirror(curlEditor, curl, {
  extendedEditorConfig: {
    mode: "application/x-sh",
    placeholder: `${t("request.enter_curl")}`,
  },
  linter: null,
  completer: null,
  environmentHighlights: false,
})

watch(
  () => props.show,
  () => {
    if (props.show) {
      curl.value = props.text.toString()
    }
  },
  { immediate: false }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}

const handleImport = () => {
  const text = curl.value
  try {
    const req = parseCurlToHoppRESTReq(text)

    setRESTRequest(req)
  } catch (e) {
    console.error(e)
    toast.error(`${t("error.curl_invalid_format")}`)
  }
  hideModal()
}

const pasteIcon = refAutoReset<typeof IconClipboard | typeof IconCheck>(
  IconClipboard,
  1000
)

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      curl.value = text
      pasteIcon.value = IconCheck
    }
  } catch (e) {
    console.error("Failed to copy: ", e)
    toast.error(t("profile.no_permission").toString())
  }
}
</script>
