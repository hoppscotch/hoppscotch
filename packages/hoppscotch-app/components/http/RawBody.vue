<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperTertiaryStickyFold"
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
            :title="t('import.json')"
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
    <div ref="rawBodyParameters"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { getEditorLangForMimeType } from "~/helpers/editorutils"
import { pluckRef, useI18n, useToast } from "~/helpers/utils/composables"
import { useRESTRequestBody } from "~/newstore/RESTSession"

const t = useI18n()

const props = defineProps<{
  contentType: string
}>()

const toast = useToast()

const rawParamsBody = pluckRef(useRESTRequestBody(), "body")
const prettifyIcon = ref("wand")

const rawInputEditorLang = computed(() =>
  getEditorLangForMimeType(props.contentType)
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
      placeholder: t("request.raw_body"),
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

const clearContent = () => {
  rawParamsBody.value = ""
}

const uploadPayload = (e: InputEvent) => {
  const file = e.target.files[0]
  if (file !== undefined && file !== null) {
    const reader = new FileReader()
    reader.onload = ({ target }) => {
      rawParamsBody.value = target?.result
    }
    reader.readAsText(file)
    toast.success(`${t("state.file_imported")}`)
  } else {
    toast.error(`${t("action.choose_file")}`)
  }
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
