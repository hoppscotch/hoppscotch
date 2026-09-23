<script setup lang="ts">
import * as TO from "fp-ts/TaskOption"
import { pipe } from "fp-ts/function"
import { refAutoReset } from "@vueuse/core"
import { reactive, ref, useTemplateRef, watch } from "vue"
import IconCheck from "~icons/lucide/check"
import IconFilePlus from "~icons/lucide/file-plus"
import IconInfo from "~icons/lucide/info"
import IconTrash2 from "~icons/lucide/trash-2"
import IconWand2 from "~icons/lucide/wand-2"
import { useCodemirror } from "~/composables/codemirror"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { prettifyJSONC } from "~/helpers/editor/linting/jsoncPretty"
import { readFileAsText } from "~/helpers/functional/files"

const body = defineModel<string>({ required: true })

const t = useI18n()
const toast = useToast()
const payload = useTemplateRef<HTMLInputElement>("payload")
const bodyEditor = useTemplateRef<HTMLDivElement>("bodyEditor")
const prettifyIcon = refAutoReset<
  typeof IconWand2 | typeof IconCheck | typeof IconInfo
>(IconWand2, 1000)

const codemirrorValue = ref<string | undefined>(body.value)

watch(body, (newVal) => {
  codemirrorValue.value = newVal
})

watch(codemirrorValue, (updatedValue) => {
  if (updatedValue !== undefined && updatedValue !== body.value) {
    body.value = updatedValue
  }
})

useCodemirror(
  bodyEditor,
  codemirrorValue,
  reactive({
    extendedEditorConfig: {
      mode: "application/json",
      placeholder: `${t("request.body")}`,
      readOnly: false,
      lineWrapping: true,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
    predefinedVariablesHighlights: false,
  })
)

const prettifyBody = () => {
  try {
    codemirrorValue.value = prettifyJSONC(codemirrorValue.value ?? "")
    prettifyIcon.value = IconCheck
  } catch (cause) {
    console.error(cause)
    prettifyIcon.value = IconInfo
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
}

const clearBody = () => {
  codemirrorValue.value = ""
}

const importBody = async (event: Event) => {
  const input = event.target as HTMLInputElement

  await pipe(
    input.files?.[0],
    TO.of,
    TO.chain(TO.fromPredicate((file): file is File => file !== undefined)),
    TO.chain(readFileAsText),
    TO.matchW(
      () => toast.error(`${t("action.choose_file")}`),
      (content) => {
        codemirrorValue.value = content
        toast.success(`${t("state.file_imported")}`)
      }
    )
  )()

  input.value = ""
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      class="flex flex-shrink-0 items-center justify-between border-b border-dividerLight bg-primary pl-4"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("request.body") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearBody"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.prettify')"
          :icon="prettifyIcon"
          @click="prettifyBody"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('import.title')"
          :icon="IconFilePlus"
          @click="payload?.click()"
        />
        <input
          ref="payload"
          class="hidden"
          type="file"
          accept=".json,application/json"
          @change="importBody"
        />
      </div>
    </div>
    <div
      ref="bodyEditor"
      class="h-full min-h-64 flex-1 overflow-auto bg-primary"
      aria-label="Request JSON"
    ></div>
  </div>
</template>
