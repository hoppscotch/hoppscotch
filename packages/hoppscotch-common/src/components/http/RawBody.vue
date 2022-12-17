<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperMobileStickyFold sm:top-upperMobileTertiaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("request.raw_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="
            [
              'application/json',
              'application/ld+json',
              'application/hal+json',
              'application/vnd.api+json',
              'application/xml',
            ].includes(contentType)
          "
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.prettify')"
          :icon="prettifyIcon"
          @click="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('import.title')"
            :icon="IconFilePlus"
            @click="payload?.click()"
          />
        </label>
        <input
          ref="payload"
          class="input"
          name="payload"
          type="file"
          @change="uploadPayload($event)"
        />
      </div>
    </div>
    <div ref="rawBodyParameters" class="flex flex-col flex-1"></div>
  </div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconWrapText from "~icons/lucide/wrap-text"
import IconTrash2 from "~icons/lucide/trash-2"
import IconFilePlus from "~icons/lucide/file-plus"
import IconWand2 from "~icons/lucide/wand-2"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import { computed, reactive, Ref, ref, watch } from "vue"
import * as TO from "fp-ts/TaskOption"
import { pipe } from "fp-ts/function"
import { ValidContentTypes } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { getEditorLangForMimeType } from "@helpers/editorutils"
import { pluckRef } from "@composables/ref"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { isJSONContentType } from "~/helpers/utils/contenttypes"
import { useRESTRequestBody } from "~/newstore/RESTSession"

import jsonLinter from "~/helpers/editor/linting/json"
import { readFileAsText } from "~/helpers/functional/files"

type PossibleContentTypes = Exclude<
  ValidContentTypes,
  "multipart/form-data" | "application/x-www-form-urlencoded"
>

const t = useI18n()

const payload = ref<HTMLInputElement | null>(null)

const props = defineProps<{
  contentType: PossibleContentTypes
}>()

const toast = useToast()

const rawParamsBody = pluckRef(useRESTRequestBody(), "body")

const prettifyIcon = refAutoReset<
  typeof IconWand2 | typeof IconCheck | typeof IconInfo
>(IconWand2, 1000)

const rawInputEditorLang = computed(() =>
  getEditorLangForMimeType(props.contentType)
)
const langLinter = computed(() =>
  isJSONContentType(props.contentType) ? jsonLinter : null
)

const linewrapEnabled = ref(true)
const rawBodyParameters = ref<any | null>(null)

const codemirrorValue: Ref<string | undefined> =
  typeof rawParamsBody.value == "string"
    ? ref(rawParamsBody.value)
    : ref(undefined)

watch(rawParamsBody, (newVal) => {
  typeof newVal == "string"
    ? (codemirrorValue.value = newVal)
    : (codemirrorValue.value = undefined)
})

// propagate the edits from codemirror back to the body
watch(codemirrorValue, (updatedValue) => {
  if (updatedValue && updatedValue != rawParamsBody.value) {
    rawParamsBody.value = updatedValue
  }
})

useCodemirror(
  rawBodyParameters,
  codemirrorValue,
  reactive({
    extendedEditorConfig: {
      lineWrapping: linewrapEnabled,
      mode: rawInputEditorLang,
      placeholder: t("request.raw_body").toString(),
    },
    linter: langLinter,
    completer: null,
    environmentHighlights: true,
  })
)

const clearContent = () => {
  rawParamsBody.value = ""
}

const uploadPayload = async (e: Event) => {
  await pipe(
    (e.target as HTMLInputElement).files?.[0],
    TO.of,
    TO.chain(TO.fromPredicate((f): f is File => f !== undefined)),
    TO.chain(readFileAsText),

    TO.matchW(
      () => toast.error(`${t("action.choose_file")}`),
      (result) => {
        rawParamsBody.value = result
        toast.success(`${t("state.file_imported")}`)
      }
    )
  )()
}

const prettifyRequestBody = () => {
  let prettifyBody = ""
  try {
    if (props.contentType.endsWith("json")) {
      const jsonObj = JSON.parse(rawParamsBody.value as string)
      prettifyBody = JSON.stringify(jsonObj, null, 2)
    } else if (props.contentType == "application/xml") {
      prettifyBody = prettifyXML(rawParamsBody.value as string)
    }
    rawParamsBody.value = prettifyBody
    prettifyIcon.value = IconCheck
  } catch (e) {
    console.error(e)
    prettifyIcon.value = IconInfo
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
}

const prettifyXML = (xml: string) => {
  const PADDING = " ".repeat(2) // set desired indent size here
  const reg = /(>)(<)(\/*)/g
  let pad = 0
  xml = xml.replace(reg, "$1\r\n$2$3")
  return xml
    .split("\r\n")
    .map((node) => {
      let indent = 0
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0
      } else if (node.match(/^<\/\w/) && pad > 0) {
        pad -= 1
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1
      } else {
        indent = 0
      }
      pad += indent
      return PADDING.repeat(pad - indent) + node
    })
    .join("\r\n")
}
</script>
