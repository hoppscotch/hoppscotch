<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="wrap-text"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :svg="downloadIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="copyResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :svg="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div ref="xmlResponse"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const toast = useToast()

const responseBodyText = computed(() => {
  if (
    props.response.type === "loading" ||
    props.response.type === "network_fail"
  )
    return ""
  if (typeof props.response.body === "string") return props.response.body
  else {
    const res = new TextDecoder("utf-8").decode(props.response.body)
    // HACK: Temporary trailing null character issue from the extension fix
    return res.replace(/\0+$/, "")
  }
})

const downloadIcon = ref("download")
const copyIcon = ref("copy")

const responseType = computed(() => {
  return (
    props.response.headers.find((h) => h.key.toLowerCase() === "content-type")
      .value || ""
  )
    .split(";")[0]
    .toLowerCase()
})

const xmlResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  xmlResponse,
  responseBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "application/xml",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

const downloadResponse = () => {
  const dataToWrite = responseBodyText.value
  const file = new Blob([dataToWrite], { type: responseType.value })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  // TODO get uri from meta
  a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
  document.body.appendChild(a)
  a.click()
  downloadIcon.value = "check"
  toast.success(`${t("state.download_started")}`)
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadIcon.value = "download"
  }, 1000)
}

const copyResponse = () => {
  copyToClipboard(responseBodyText.value)
  copyIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}
</script>
