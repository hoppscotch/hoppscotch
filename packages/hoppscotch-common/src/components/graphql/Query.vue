<template>
  <div
    class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight gqlRunQuery"
  >
    <label class="font-semibold text-secondaryLight">
      {{ t("request.query") }}
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
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        :title="`${t(
          'request.save'
        )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
        :label="`${t('request.save')}`"
        :icon="IconSave"
        class="rounded-none"
        @click="saveRequest"
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
        @click="clearGQLQuery()"
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
        :icon="prettifyQueryIcon"
        @click="prettifyQuery"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        :icon="copyQueryIcon"
        @click="copyQuery"
      />
    </div>
  </div>
  <div ref="queryEditor" class="flex flex-col flex-1"></div>
</template>

<script setup lang="ts">
import IconPlay from "~icons/lucide/play"
import IconStop from "~icons/lucide/stop-circle"
import IconSave from "~icons/lucide/save"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconWand from "~icons/lucide/wand"
import IconWrapText from "~icons/lucide/wrap-text"
import { onMounted, reactive, ref, markRaw } from "vue"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { refAutoReset, useVModel } from "@vueuse/core"
import { useToast } from "~/composables/toast"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import * as gql from "graphql"
import { createGQLQueryLinter } from "~/helpers/editor/linting/gqlQuery"
import queryCompleter from "~/helpers/editor/completion/gqlQuery"
import { selectedGQLOpHighlight } from "~/helpers/editor/gql/operation"
import { debounce } from "lodash-es"
import { ViewUpdate } from "@codemirror/view"
import { defineActionHandler } from "~/helpers/actions"
import {
  schema,
  socketDisconnect,
  subscriptionState,
} from "~/helpers/graphql/connection"

// Template refs
const queryEditor = ref<any | null>(null)

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

const copyQueryIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)
const prettifyQueryIcon = refAutoReset<
  typeof IconWand | typeof IconCheck | typeof IconInfo
>(IconWand, 1000)

const linewrapEnabled = ref(true)

const selectedOperation = ref<gql.OperationDefinitionNode | null>(null)

const gqlQueryString = useVModel(props, "modelValue", emit)

const debouncedOnUpdateQueryState = debounce((update: ViewUpdate) => {
  if (!update.selectionSet) return

  const selectedPos = update.state.selection.main.head
  const queryString = update.state.doc.toJSON().join(update.state.lineBreak)

  try {
    const operations = gql.parse(queryString)
    if (operations.definitions.length === 1) {
      selectedOperation.value = operations
        .definitions[0] as gql.OperationDefinitionNode
      return
    }

    selectedOperation.value =
      (operations.definitions.find((def) => {
        if (def.kind !== "OperationDefinition") return false
        const { start, end } = def.loc!
        return selectedPos >= start && selectedPos <= end
      }) as gql.OperationDefinitionNode) ?? null
  } catch (error) {
    // console.error(error)
  }
}, 300)

onMounted(() => {
  try {
    const operations = gql.parse(gqlQueryString.value)
    if (operations.definitions.length) {
      selectedOperation.value = operations
        .definitions[0] as gql.OperationDefinitionNode
      return
    }
  } catch (error) {}
})

useCodemirror(
  queryEditor,
  gqlQueryString,
  reactive({
    extendedEditorConfig: {
      mode: "graphql",
      placeholder: `${t("request.query")}`,
      lineWrapping: linewrapEnabled,
    },
    linter: createGQLQueryLinter(schema),
    completer: queryCompleter(schema),
    environmentHighlights: false,
    additionalExts: [markRaw(selectedGQLOpHighlight)],
    onUpdate: debouncedOnUpdateQueryState,
  })
)

// operations on graphql query string
// const operations = useReadonlyStream(props.request.operations$, [])

const prettifyQuery = () => {
  try {
    gqlQueryString.value = gql.print(
      gql.parse(gqlQueryString.value, {
        allowLegacyFragmentVariables: true,
      })
    )
    prettifyQueryIcon.value = IconCheck
  } catch (e) {
    toast.error(`${t("error.gql_prettify_invalid_query")}`)
    prettifyQueryIcon.value = IconInfo
  }
}

const copyQuery = () => {
  copyToClipboard(gqlQueryString.value)
  copyQueryIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const clearGQLQuery = () => {
  gqlQueryString.value = ""
}

const runQuery = (definition: gql.OperationDefinitionNode | null = null) => {
  emit("run-query", definition)
}
const unsubscribe = () => {
  socketDisconnect()
}
const saveRequest = () => {
  emit("save-request")
}

defineActionHandler("editor.format", prettifyQuery)
</script>
