<template>
  <SmartModal
    v-if="show"
    :title="$t('import.curl').toString()"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <div
          ref="curlEditor"
          class="w-full border border-dividerLight rounded block"
        ></div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="$t('import.title').toString()"
          @click.native="handleImport"
        />
        <ButtonSecondary
          :label="$t('action.cancel').toString()"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, useContext } from "@nuxtjs/composition-api"
import parseCurlCommand from "~/helpers/curlparser"
import { useCodemirror } from "~/helpers/editor/codemirror"
import {
  HoppRESTHeader,
  HoppRESTParam,
  makeRESTRequest,
} from "~/helpers/types/HoppRESTRequest"
import { setRESTRequest } from "~/newstore/RESTSession"
import "codemirror/mode/shell/shell"

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

const curl = ref("")

const curlEditor = ref<any | null>(null)

useCodemirror(curlEditor, curl, {
  extendedEditorConfig: {
    mode: "application/x-sh",
    placeholder: t("request.enter_curl").toString(),
  },
  linter: null,
  completer: null,
})

defineProps<{ show: boolean }>()

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
          body: "",
        },
      })
    )
  } catch (e) {
    console.error(e)
    $toast.error(t("error.curl_invalid_format").toString(), {
      icon: "error_outline",
    })
  }
  hideModal()
}
</script>
