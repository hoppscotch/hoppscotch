<template>
  <SmartModal v-if="show" :title="`${t('import.curl')}`" @close="hideModal">
    <template #body>
      <div class="px-2 h-46">
        <div
          ref="curlEditor"
          class="h-full border rounded border-dividerLight"
        ></div>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          ref="importButton"
          :label="`${t('import.title')}`"
          @click.native="handleImport"
        />
        <ButtonSecondary
          :label="`${t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
      <span class="flex">
        <ButtonSecondary
          :svg="pasteIcon"
          :label="`${t('action.paste')}`"
          filled
          @click.native="handlePaste"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import {
  HoppRESTHeader,
  HoppRESTParam,
  makeRESTRequest,
} from "@hoppscotch/data"
import parseCurlCommand from "~/helpers/curlparser"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { setRESTRequest } from "~/newstore/RESTSession"
import { useI18n, useToast } from "~/helpers/utils/composables"

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
    const parsedCurl = parseCurlCommand(text)
    const { origin, pathname } = new URL(
      parsedCurl.url.replace(/"/g, "").replace(/'/g, "")
    )
    const endpoint = origin + pathname
    const headers: HoppRESTHeader[] = []
    const params: HoppRESTParam[] = []
    const body = parsedCurl.body
    if (parsedCurl.query) {
      for (const key of Object.keys(parsedCurl.query)) {
        const val = parsedCurl.query[key]!

        if (Array.isArray(val)) {
          val.forEach((value) => {
            params.push({
              key,
              value,
              active: true,
            })
          })
        } else {
          params.push({
            key,
            value: val!,
            active: true,
          })
        }
      }
    }
    if (parsedCurl.headers) {
      for (const key of Object.keys(parsedCurl.headers)) {
        headers.push({
          key,
          value: parsedCurl.headers[key],
          active: true,
        })
      }
    }

    const method = parsedCurl.method.toUpperCase()

    setRESTRequest(
      makeRESTRequest({
        name: "Untitled request",
        endpoint,
        method,
        params,
        headers,
        preRequestScript: "",
        testScript: "",
        auth: {
          authType: "none",
          authActive: true,
        },
        body: {
          contentType: "application/json",
          body,
        },
      })
    )
  } catch (e) {
    console.error(e)
    toast.error(`${t("error.curl_invalid_format")}`)
  }
  hideModal()
}

const pasteIcon = ref("clipboard")

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      curl.value = text
      pasteIcon.value = "check"
      setTimeout(() => (pasteIcon.value = "clipboard"), 1000)
    }
  } catch (e) {
    console.error("Failed to copy: ", e)
    toast.error(t("profile.no_permission").toString())
  }
}
</script>
