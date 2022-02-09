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
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTReqBodyFormData,
  makeRESTRequest,
} from "@hoppscotch/data"
import parseCurlCommand from "~/helpers/curlparser"
import { curlParserRequest } from "~/helpers/types/CurlParserResult"
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

    const method = parsedCurl.method?.toUpperCase() || "GET"
    const contentType = parsedCurl.contentType
    const auth: HoppRESTAuth = getAuthObject(parsedCurl, username, password)

    // append danglingParams to url
    if (danglingParams.length > 0) endpoint += "?" + danglingParams.join("&")

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

function getAuthObject(
  parsedCurl: curlParserRequest,
  username?: string,
  password?: string
) {
  // >> preference order:
  //    - Auth headers
  //    - --user arg
  //    - Creds provided along with URL
  let auth: HoppRESTAuth = { authActive: false, authType: "none" }
  const user: string = parsedCurl.user ?? ""

  if (parsedCurl.auth) {
    const { type, token } = parsedCurl.auth
    auth = {
      authType: type.toLowerCase(),
      token,
    } as HoppRESTAuth
  } else {
    auth = {
      authType:
        (username && username.length > 0) || user.length > 0 ? "basic" : "none",
      authActive: true,
      ...(username &&
        username.length > 0 && {
          username,
          password: password || "",
        }),
      ...(user.length > 0 && {
        username: user.split(":")[0],
        password: user.split(":")[1],
      }),
    } as HoppRESTAuth
  }

  return auth
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
