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
      <div ref="jsonResponse" class="w-full block"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useContext } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import "codemirror/mode/javascript/javascript"
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

const jsonBodyText = computed(() => {
  try {
    return JSON.stringify(JSON.parse(responseBodyText.value), null, 2)
  } catch (e) {
    // Most probs invalid JSON was returned, so drop prettification (should we warn ?)
    return responseBodyText.value
  }
})

const jsonResponse = ref<any | null>(null)

useCodemirror(jsonResponse, jsonBodyText, {
  extendedEditorConfig: {
    mode: "javascript",
    readOnly: true,
  },
  linter: null,
  completer: null,
})

const downloadResponse = () => {
  const dataToWrite = responseBodyText.value
  const file = new Blob([dataToWrite], { type: "application/json" })
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
</script>
