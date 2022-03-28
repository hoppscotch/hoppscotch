<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperMobileRawStickyFold sm:top-upperMobileRawTertiaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("request.raw_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="wrap-text"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          svg="trash-2"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-if="contentType && contentType.endsWith('json')"
          ref="prettifyRequest"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.prettify')"
          :svg="prettifyIcon"
          @click.native="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('import.title')"
            svg="file-plus"
            @click.native="$refs.payload.click()"
          />
        </label>
        <input
          ref="payload"
          class="input"
          name="payload"
          type="file"
          @change="uploadPayload"
        />
      </div>
    </div>
    <div ref="rawBodyParameters" class="flex flex-col flex-1"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, Ref, ref } from "@nuxtjs/composition-api"
import * as TO from "fp-ts/TaskOption"
import { pipe } from "fp-ts/function"
import { HoppRESTReqBody, ValidContentTypes } from "@hoppscotch/data"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { getEditorLangForMimeType } from "~/helpers/editorutils"
import { pluckRef, useI18n, useToast } from "~/helpers/utils/composables"
import { isJSONContentType } from "~/helpers/utils/contenttypes"
import { useRESTRequestBody } from "~/newstore/RESTSession"

import jsonLinter from "~/helpers/editor/linting/json"
import { readFileAsText } from "~/helpers/functional/files"

type PossibleContentTypes = Exclude<
  ValidContentTypes,
  "multipart/form-data" | "application/x-www-form-urlencoded"
>

const t = useI18n()

const props = defineProps<{
  contentType: PossibleContentTypes
}>()

const toast = useToast()

const rawParamsBody = pluckRef(
  useRESTRequestBody() as Ref<
    HoppRESTReqBody & {
      contentType: PossibleContentTypes
    }
  >,
  "body"
)
const prettifyIcon = ref("wand")

const rawInputEditorLang = computed(() =>
  getEditorLangForMimeType(props.contentType)
)
const langLinter = computed(() =>
  isJSONContentType(props.contentType) ? jsonLinter : null
)

const linewrapEnabled = ref(true)
const rawBodyParameters = ref<any | null>(null)

useCodemirror(
  rawBodyParameters,
  rawParamsBody,
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

const uploadPayload = async (e: InputEvent) => {
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
  try {
    const jsonObj = JSON.parse(rawParamsBody.value)
    rawParamsBody.value = JSON.stringify(jsonObj, null, 2)
    prettifyIcon.value = "check"
  } catch (e) {
    console.error(e)
    prettifyIcon.value = "info"
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
  setTimeout(() => (prettifyIcon.value = "wand"), 1000)
}
</script>
