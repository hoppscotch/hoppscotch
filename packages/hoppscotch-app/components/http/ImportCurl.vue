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
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import {
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  makeRESTRequest,
  ValidContentTypes,
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
    const { origin, pathname, username, password } = new URL(parsedCurl.url)
    let endpoint = origin + pathname
    const headers: HoppRESTHeader[] = []
    const params: HoppRESTParam[] = []
    const body = parsedCurl.body

    const danglingParams: string[] = []
    if (parsedCurl.query) {
      for (const key of Object.keys(parsedCurl.query)) {
        const val = parsedCurl.query[key]!

        if (Array.isArray(val)) {
          val.forEach((value) => {
            if (value === "") {
              danglingParams.push(key)
              return
            }
            params.push({
              key,
              value,
              active: true,
            })
          })
        } else {
          if (val === "") {
            danglingParams.push(key)
            continue
          }
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
    const contentType: Exclude<ValidContentTypes, "multipart/form-data"> =
      parsedCurl.headers?.contentType || "application/json"

    // TODO: implement all other types of auth
    // in a separate helper file
    // >> preference to dedicated creds using --user arg
    const user: string = parsedCurl.user ?? ""
    const auth = {
      authType: username.length > 0 || user.length > 0 ? "basic" : "none",
      authActive: true,
      ...(username.length > 0 && {
        username,
        password,
      }),
      ...(user.length > 0 && {
        username: user.split(":")[0],
        password: user.split(":")[1],
      }),
    } as HoppRESTAuth

    // append danglingParams to url
    endpoint += "?" + danglingParams.join("&")

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
        body: {
          contentType,
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
</script>
