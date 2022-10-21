<template>
  <div
    class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
  >
    <label class="font-semibold text-secondaryLight">
      {{ t("request.variables") }}
    </label>
    <div class="flex">
      <ButtonSecondary
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
      <tippy
        v-else-if="operations.length > 1"
        ref="operationTippy"
        interactive
        trigger="click"
        theme="popover"
        placement="bottom"
        :on-shown="() => tippyActions.focus()"
      >
        <ButtonSecondary
          v-tippy="{
            theme: 'tooltip',
            delay: [500, 20],
            allowHTML: true,
          }"
          :title="`${t(
            'request.run'
          )} <xmp>${getSpecialKey()}</xmp><xmp>G</xmp>`"
          :label="`${t('request.run')}`"
          :icon="IconPlay"
          class="rounded-none !text-accent !hover:text-accentDark"
        />
        <template #content="{ hide }">
          <div ref="tippyActions" class="flex flex-col" role="menu">
            <SmartItem
              v-for="item in operations"
              :key="`gql-operation-${item.name?.value}`"
              :label="item?.name?.value"
              @click="
                () => {
                  runQuery(item)
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>

      <ButtonSecondary
        v-else
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          allowHTML: true,
        }"
        :title="`${t('request.run')} <xmp>${getSpecialKey()}</xmp><xmp>G</xmp>`"
        :label="`${t('request.run')}`"
        :icon="IconPlay"
        class="rounded-none !text-accent !hover:text-accentDark"
        @click="runQuery()"
      />

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
import IconPlay from "~icons/lucide/play"
import IconStop from "~icons/lucide/stop-circle"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconWand from "~icons/lucide/wand"
import { computed, reactive, ref } from "vue"
import jsonLinter from "~/helpers/editor/linting/json"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useCodemirror } from "@composables/codemirror"
import * as gql from "graphql"
import { useI18n } from "@composables/i18n"
import { refAutoReset } from "@vueuse/core"
import { useToast } from "~/composables/toast"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { GQLConnection } from "~/helpers/graphql/GQLConnection"
import { GQLRequest } from "~/helpers/graphql/GQLRequest"

const tippyActions = ref<any | null>(null)

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  conn: GQLConnection
  request: GQLRequest
}>()

const emit = defineEmits<{
  (e: "save-request"): void
  (e: "run-query", definition: gql.OperationDefinitionNode | null): void
}>()

const subscriptionState = useReadonlyStream(
  props.conn.subscriptionState$,
  "UNSUBSCRIBED"
)

// Watch operations on graphql query string
const operations = useReadonlyStream(props.request.operations$, [])

const variableString = useStream(
  props.request.variables$,
  "",
  props.request.setGQLVariables.bind(props.request)
)
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

const runQuery = (definition: gql.OperationDefinitionNode | null = null) => {
  emit("run-query", definition)
}
const unsubscribe = () => {
  props.conn.socketDisconnect()
}
</script>
