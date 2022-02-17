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
  FormDataKeyValue,
  HoppRESTReqBody,
  HoppRESTReqBodyFormData,
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
    const endpoint = parsedCurl.urlString
    const params = parsedCurl.queries || []
    const body = parsedCurl.body

    const method = parsedCurl.method?.toUpperCase() || "GET"
    const contentType = parsedCurl.contentType
    const auth = parsedCurl.auth
    const headers =
      parsedCurl.hoppHeaders.filter(
        (header) =>
          header.key !== "Authorization" &&
          header.key !== "apikey" &&
          header.key !== "api-key"
      ) || []

    // final body if multipart data is not present
    let finalBody = {
      contentType,
      body: body as string | null,
    } as HoppRESTReqBody

    // if multipart data is present
    if (Object.keys(parsedCurl.multipartUploads).length > 0) {
      const ydob: FormDataKeyValue[] = []
      for (const key in parsedCurl.multipartUploads) {
        ydob.push({
          active: true,
          isFile: false,
          key,
          value: parsedCurl.multipartUploads[key],
        })
      }
      finalBody = {
        contentType: "multipart/form-data",
        body: ydob,
      } as HoppRESTReqBodyFormData
    }

    setRESTRequest(
      makeRESTRequest({
        name: "Untitled request",
        endpoint,
        method,
        params,
        headers,
        preRequestScript: "",
        testScript: "",
        auth,
        body: finalBody,
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
