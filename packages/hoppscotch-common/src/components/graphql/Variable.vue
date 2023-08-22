<template>
  <div
    class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
  >
    <label class="font-semibold text-secondaryLight">
      {{ t("request.variables") }}
    </label>
    <div class="flex">
      <HoppButtonSecondary
        v-if="subscriptionState === 'SUBSCRIBED'"
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          allowHTML: true,
        }"
        :title="`${t('request.stop')}`"
        :label="`${t('request.stop')}`"
        :icon="IconStop"
        class="rounded-none !text-accent !hover:text-accentDark"
        @click="unsubscribe()"
      />
      <HoppButtonSecondary
        v-if="selectedOperation && subscriptionState !== 'SUBSCRIBED'"
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          allowHTML: true,
        }"
        :title="`${t('request.run')} <kbd>${getSpecialKey()}</kbd><kbd>G</kbd>`"
        :label="`${selectedOperation.name?.value ?? t('request.run')}`"
        :icon="IconPlay"
        :disabled="!selectedOperation"
        class="rounded-none !text-accent !hover:text-accentDark"
        @click="runQuery(selectedOperation)"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/documentation/features/graphql-api-testing"
        blank
        :title="t('app.wiki')"
        :icon="IconHelpCircle"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.clear_all')"
        :icon="IconTrash2"
        @click="clearGQLVariables()"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('state.linewrap')"
        :class="{ '!text-accent': linewrapEnabled }"
        :icon="IconWrapText"
        @click.prevent="linewrapEnabled = !linewrapEnabled"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.prettify')"
        :icon="prettifyVariablesIcon"
        @click="prettifyVariableString"
      />
      <HoppButtonSecondary
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
import IconPlay from "~icons/lucide/play"
import IconStop from "~icons/lucide/stop-circle"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconWand from "~icons/lucide/wand"
import IconWrapText from "~icons/lucide/wrap-text"
import { computed, reactive, ref } from "vue"
import jsonLinter from "~/helpers/editor/linting/json"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useCodemirror } from "@composables/codemirror"
import * as gql from "graphql"
import { useI18n } from "@composables/i18n"
import { refAutoReset, useVModel } from "@vueuse/core"
import { useToast } from "~/composables/toast"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import {
  socketDisconnect,
  subscriptionState,
} from "~/helpers/graphql/connection"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: "save-request"): void
  (e: "update:modelValue", val: string): void
  (e: "run-query", definition: gql.OperationDefinitionNode | null): void
}>()

// Watch operations on graphql query string
const selectedOperation = ref<gql.OperationDefinitionNode | null>(null)

const variableString = useVModel(props, "modelValue", emit)

const variableEditor = ref<any | null>(null)

const linewrapEnabled = ref(false)

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
      lineWrapping: linewrapEnabled,
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

const runQuery = (definition: gql.OperationDefinitionNode | null = null) => {
  emit("run-query", definition)
}
const unsubscribe = () => {
  socketDisconnect()
}
</script>
