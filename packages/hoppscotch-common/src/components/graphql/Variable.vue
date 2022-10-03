<template>
  <div
    class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
  >
    <label class="font-semibold text-secondaryLight">
      {{ t("request.variables") }}
    </label>
    <div class="flex">
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/graphql"
        blank
        :title="t('app.wiki')"
        :icon="IconHelpCircle"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.clear_all')"
        :icon="IconTrash2"
        @click="clearGQLVariables()"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.prettify')"
        :icon="prettifyVariablesIcon"
        @click="prettifyVariableString"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        :icon="copyVariablesIcon"
        @click="copyVariables"
      />
    </div>
  </div>
  <div ref="variableEditor" class="flex flex-col flex-1"></div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconWand from "~icons/lucide/wand"
import { computed, reactive, ref } from "vue"
import jsonLinter from "~/helpers/editor/linting/json"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { gqlVariables$, setGQLVariables } from "~/newstore/GQLSession"
import { useStream } from "@composables/stream"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { refAutoReset } from "@vueuse/core"
import { useToast } from "~/composables/toast"

const t = useI18n()
const toast = useToast()

const variableString = useStream(gqlVariables$, "", setGQLVariables)
const variableEditor = ref<any | null>(null)

const copyVariablesIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)
const prettifyVariablesIcon = refAutoReset<
  typeof IconWand | typeof IconCheck | typeof IconInfo
>(IconWand, 1000)

useCodemirror(
  variableEditor,
  variableString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      placeholder: `${t("request.variables")}`,
    },
    linter: computed(() =>
      variableString.value.length > 0 ? jsonLinter : null
    ),
    completer: null,
    environmentHighlights: false,
  })
)

const copyVariables = () => {
  copyToClipboard(variableString.value)
  copyVariablesIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const prettifyVariableString = () => {
  try {
    const jsonObj = JSON.parse(variableString.value)
    variableString.value = JSON.stringify(jsonObj, null, 2)
    prettifyVariablesIcon.value = IconCheck
  } catch (e) {
    console.error(e)
    prettifyVariablesIcon.value = IconInfo
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
}

const clearGQLVariables = () => {
  variableString.value = ""
}
</script>
