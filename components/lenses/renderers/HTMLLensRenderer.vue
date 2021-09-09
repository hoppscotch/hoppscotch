<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-lowerSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="corner-down-left"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="
            previewEnabled ? $t('hide.preview') : $t('response.preview_html')
          "
          :svg="!previewEnabled ? 'eye' : 'eye-off'"
          @click.native.prevent="togglePreview"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.download_file')"
          :svg="downloadIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="copyResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.copy')"
          :svg="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div class="relative">
      <div ref="htmlResponse" class="w-full block"></div>
      <iframe
        ref="previewFrame"
        :class="{ hidden: !previewEnabled }"
        class="covers-response"
        src="about:blank"
      ></iframe>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useContext, reactive } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import "codemirror/mode/htmlmixed/htmlmixed"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

const props = defineProps<{
  response: HoppRESTResponse
}>()

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

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
const previewEnabled = ref(false)
const previewFrame = ref<any | null>(null)
const url = ref("")

const htmlResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  htmlResponse,
  responseBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "javascript",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
  })
)

const downloadResponse = () => {
  const dataToWrite = responseBodyText.value
  const file = new Blob([dataToWrite], { type: "text/html" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  // TODO get uri from meta
  a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
  document.body.appendChild(a)
  a.click()
  downloadIcon.value = "check"
  $toast.success(t("state.download_started").toString(), {
    icon: "downloading",
  })
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadIcon.value = "download"
  }, 1000)
}

const copyResponse = () => {
  copyToClipboard(responseBodyText.value)
  copyIcon.value = "check"
  $toast.success(t("state.copied_to_clipboard").toString(), {
    icon: "content_paste",
  })
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}

const togglePreview = () => {
  previewEnabled.value = !previewEnabled.value
  if (previewEnabled.value) {
    if (previewFrame.value.getAttribute("data-previewing-url") === url.value)
      return
    // Use DOMParser to parse document HTML.
    const previewDocument = new DOMParser().parseFromString(
      responseBodyText.value,
      "text/html"
    )
    // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
    previewDocument.head.innerHTML =
      `<base href="${url.value}">` + previewDocument.head.innerHTML
    // Finally, set the iframe source to the resulting HTML.
    previewFrame.value.srcdoc = previewDocument.documentElement.outerHTML
    previewFrame.value.setAttribute("data-previewing-url", url.value)
  }
}
</script>

<style lang="scss" scoped>
.covers-response {
  @apply absolute;
  @apply inset-0;
  @apply bg-white;
  @apply h-full;
  @apply w-full;
  @apply border;
  @apply border-dividerLight;
  @apply z-5;
}
</style>
