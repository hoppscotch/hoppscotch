<template>
  <div class="flex flex-col flex-1 h-full">
    <SmartTabs
      v-model="selectedOptionTab"
      styles="sticky bg-primary top-upperPrimaryStickyFold z-10"
      render-inactive-tabs
    >
      <SmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :indicator="gqlQueryString && gqlQueryString.length > 0 ? true : false"
      >
        <div
          class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold gqlRunQuery"
        >
          <label class="font-semibold text-secondaryLight">
            {{ t("request.query") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
              :title="`${t(
                'request.run'
              )} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
              :label="`${t('request.run')}`"
              :icon="IconPlay"
              class="rounded-none !text-accent !hover:text-accentDark"
              @click="runQuery()"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
              :title="`${t(
                'request.save'
              )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
              :label="`${t('request.save')}`"
              :icon="IconSave"
              class="rounded-none"
              @click="saveRequest"
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
              @click="clearGQLQuery()"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('state.linewrap')"
              :class="{ '!text-accent': linewrapEnabledQuery }"
              :icon="IconWrapText"
              @click.prevent="linewrapEnabledQuery = !linewrapEnabledQuery"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.prettify')"
              :icon="prettifyQueryIcon"
              @click="prettifyQuery"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :icon="copyQueryIcon"
              @click="copyQuery"
            />
          </div>
        </div>
        <div ref="queryEditor" class="flex flex-col flex-1"></div>
      </SmartTab>
      <SmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="variableString && variableString.length > 0 ? true : false"
      >
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
              :title="t('state.linewrap')"
              :class="{ '!text-accent': linewrapEnabledVariable }"
              :icon="IconWrapText"
              @click.prevent="
                linewrapEnabledVariable = !linewrapEnabledVariable
              "
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
      </SmartTab>
      <SmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <div
          class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
        >
          <label class="font-semibold text-secondaryLight">
            {{ t("tab.headers") }}
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
              @click="clearContent()"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('state.linewrap')"
              :class="{ '!text-accent': linewrapEnabled }"
              :icon="IconWrapText"
              @click.prevent="linewrapEnabled = !linewrapEnabled"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('state.bulk_mode')"
              :icon="IconEdit"
              :class="{ '!text-accent': bulkMode }"
              @click="bulkMode = !bulkMode"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('add.new')"
              :icon="IconPlus"
              :disabled="bulkMode"
              @click="addHeader"
            />
          </div>
        </div>
        <div
          v-if="bulkMode"
          ref="bulkEditor"
          class="flex flex-col flex-1"
        ></div>
        <div v-else>
          <draggable
            v-model="workingHeaders"
            :item-key="(header) => `header-${header.id}`"
            animation="250"
            handle=".draggable-handle"
            draggable=".draggable-content"
            ghost-class="cursor-move"
            chosen-class="bg-primaryLight"
            drag-class="cursor-grabbing"
          >
            <template #item="{ element: header, index }">
              <div
                class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
              >
                <span>
                  <ButtonSecondary
                    v-tippy="{
                      theme: 'tooltip',
                      delay: [500, 20],
                      content:
                        index !== workingHeaders?.length - 1
                          ? t('action.drag_to_reorder')
                          : null,
                    }"
                    :icon="IconGripVertical"
                    class="cursor-auto text-primary hover:text-primary"
                    :class="{
                      'draggable-handle group-hover:text-secondaryLight !cursor-grab':
                        index !== workingHeaders?.length - 1,
                    }"
                    tabindex="-1"
                  />
                </span>
                <SmartAutoComplete
                  :placeholder="`${t('count.header', { count: index + 1 })}`"
                  :source="commonHeaders"
                  :spellcheck="false"
                  :value="header.key"
                  autofocus
                  styles="
                bg-transparent
                flex
                flex-1
                py-1
                px-4
                truncate
              "
                  class="flex-1 !flex"
                  @input="
                    updateHeader(index, {
                      id: header.id,
                      key: $event,
                      value: header.value,
                      active: header.active,
                    })
                  "
                />
                <input
                  class="flex flex-1 px-4 py-2 bg-transparent"
                  :placeholder="`${t('count.value', { count: index + 1 })}`"
                  :name="`value ${String(index)}`"
                  :value="header.value"
                  autofocus
                  @change="
                    updateHeader(index, {
                      id: header.id,
                      key: header.key,
                      value: ($event!.target! as HTMLInputElement).value,
                      active: header.active,
                    })
                  "
                />
                <span>
                  <ButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="
                      header.hasOwnProperty('active')
                        ? header.active
                          ? t('action.turn_off')
                          : t('action.turn_on')
                        : t('action.turn_off')
                    "
                    :icon="
                      header.hasOwnProperty('active')
                        ? header.active
                          ? IconCheckCircle
                          : IconCircle
                        : IconCheckCircle
                    "
                    color="green"
                    @click="
                      updateHeader(index, {
                        id: header.id,
                        key: header.key,
                        value: header.value,
                        active: !header.active,
                      })
                    "
                  />
                </span>
                <span>
                  <ButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.remove')"
                    :icon="IconTrash"
                    color="red"
                    @click="deleteHeader(index)"
                  />
                </span>
              </div>
            </template>
          </draggable>
          <div
            v-if="workingHeaders.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/add_category.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${t('empty.headers')}`"
            />
            <span class="pb-4 text-center">
              {{ t("empty.headers") }}
            </span>
            <ButtonSecondary
              :label="`${t('add.new')}`"
              filled
              :icon="IconPlus"
              class="mb-4"
              @click="addHeader"
            />
          </div>
        </div>
      </SmartTab>
      <SmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        <GraphqlAuthorization />
      </SmartTab>
    </SmartTabs>
    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script setup lang="ts">
import IconPlay from "~icons/lucide/play"
import IconSave from "~icons/lucide/save"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconPlus from "~icons/lucide/plus"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconTrash from "~icons/lucide/trash"
import IconCircle from "~icons/lucide/circle"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconWand2 from "~icons/lucide/wand-2"
import IconWrapText from "~icons/lucide/wrap-text"
import { Ref, computed, reactive, ref, watch } from "vue"
import * as gql from "graphql"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import { pipe, flow } from "fp-ts/function"
import {
  GQLHeader,
  makeGQLRequest,
  rawKeyValueEntriesToString,
  parseRawKeyValueEntriesE,
  RawKeyValueEntry,
} from "@hoppscotch/data"
import draggable from "vuedraggable"
import { clone, cloneDeep, isEqual } from "lodash-es"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import {
  gqlAuth$,
  gqlHeaders$,
  gqlQuery$,
  gqlResponse$,
  gqlURL$,
  gqlVariables$,
  setGQLAuth,
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLVariables,
} from "~/newstore/GQLSession"
import { commonHeaders } from "~/helpers/headers"
import { GQLConnection } from "~/helpers/GQLConnection"
import { makeGQLHistoryEntry, addGraphqlHistoryEntry } from "~/newstore/history"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { getCurrentStrategyID } from "~/helpers/network"
import { useCodemirror } from "@composables/codemirror"
import jsonLinter from "~/helpers/editor/linting/json"
import { createGQLQueryLinter } from "~/helpers/editor/linting/gqlQuery"
import queryCompleter from "~/helpers/editor/completion/gqlQuery"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { objRemoveKey } from "~/helpers/functional/object"

type OptionTabs = "query" | "headers" | "variables" | "authorization"

const colorMode = useColorMode()

const selectedOptionTab = ref<OptionTabs>("query")

const t = useI18n()

const props = defineProps<{
  conn: GQLConnection
}>()

const toast = useToast()

const url = useReadonlyStream(gqlURL$, "")
const gqlQueryString = useStream(gqlQuery$, "", setGQLQuery)
const variableString = useStream(gqlVariables$, "", setGQLVariables)

const idTicker = ref(0)

const bulkMode = ref(false)
const bulkHeaders = ref("")
const bulkEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(
  bulkEditor,
  bulkHeaders,
  reactive({
    extendedEditorConfig: {
      mode: "text/x-yaml",
      placeholder: `${t("state.bulk_mode_placeholder")}`,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

// The functional headers list (the headers actually in the system)
const headers = useStream(gqlHeaders$, [], setGQLHeaders) as Ref<GQLHeader[]>

const auth = useStream(
  gqlAuth$,
  { authType: "none", authActive: true },
  setGQLAuth
)

// The UI representation of the headers list (has the empty end header)
const workingHeaders = ref<Array<GQLHeader & { id: number }>>([
  {
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working Headers always have one empty header or the last element is always an empty header
watch(workingHeaders, (headersList) => {
  if (
    headersList.length > 0 &&
    headersList[headersList.length - 1].key !== ""
  ) {
    workingHeaders.value.push({
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between headers and working headers
watch(
  headers,
  (newHeadersList) => {
    // Sync should overwrite working headers
    const filteredWorkingHeaders = pipe(
      workingHeaders.value,
      A.filterMap(
        flow(
          O.fromPredicate((e) => e.key !== ""),
          O.map(objRemoveKey("id"))
        )
      )
    )

    const filteredBulkHeaders = pipe(
      parseRawKeyValueEntriesE(bulkHeaders.value),
      E.map(
        flow(
          RA.filter((e) => e.key !== ""),
          RA.toArray
        )
      ),
      E.getOrElse(() => [] as RawKeyValueEntry[])
    )

    if (!isEqual(newHeadersList, filteredWorkingHeaders)) {
      workingHeaders.value = pipe(
        newHeadersList,
        A.map((x) => ({ id: idTicker.value++, ...x }))
      )
    }

    if (!isEqual(newHeadersList, filteredBulkHeaders)) {
      bulkHeaders.value = rawKeyValueEntriesToString(newHeadersList)
    }
  },
  { immediate: true }
)

watch(workingHeaders, (newWorkingHeaders) => {
  const fixedHeaders = pipe(
    newWorkingHeaders,
    A.filterMap(
      flow(
        O.fromPredicate((e) => e.key !== ""),
        O.map(objRemoveKey("id"))
      )
    )
  )

  if (!isEqual(headers.value, fixedHeaders)) {
    headers.value = cloneDeep(fixedHeaders)
  }
})

// Bulk Editor Syncing with Working Headers
watch(bulkHeaders, (newBulkHeaders) => {
  const filteredBulkHeaders = pipe(
    parseRawKeyValueEntriesE(newBulkHeaders),
    E.map(
      flow(
        RA.filter((e) => e.key !== ""),
        RA.toArray
      )
    ),
    E.getOrElse(() => [] as RawKeyValueEntry[])
  )

  if (!isEqual(headers.value, filteredBulkHeaders)) {
    headers.value = filteredBulkHeaders
  }
})

watch(workingHeaders, (newHeadersList) => {
  // If we are in bulk mode, don't apply direct changes
  if (bulkMode.value) return

  try {
    const currentBulkHeaders = bulkHeaders.value.split("\n").map((item) => ({
      key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^#/, ""),
      value: item.substring(item.indexOf(":") + 1).trimLeft(),
      active: !item.trim().startsWith("#"),
    }))

    const filteredHeaders = newHeadersList.filter((x) => x.key !== "")

    if (!isEqual(currentBulkHeaders, filteredHeaders)) {
      bulkHeaders.value = rawKeyValueEntriesToString(filteredHeaders)
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

const addHeader = () => {
  workingHeaders.value.push({
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  })
}

const updateHeader = (index: number, header: GQLHeader & { id: number }) => {
  workingHeaders.value = workingHeaders.value.map((h, i) =>
    i === index ? header : h
  )
}

const deleteHeader = (index: number) => {
  const headersBeforeDeletion = clone(workingHeaders.value)

  if (
    !(
      headersBeforeDeletion.length > 0 &&
      index === headersBeforeDeletion.length - 1
    )
  ) {
    if (deletionToast.value) {
      deletionToast.value.goAway(0)
      deletionToast.value = null
    }

    deletionToast.value = toast.success(`${t("state.deleted")}`, {
      action: [
        {
          text: `${t("action.undo")}`,
          onClick: (_, toastObject) => {
            workingHeaders.value = headersBeforeDeletion
            toastObject.goAway(0)
            deletionToast.value = null
          },
        },
      ],

      onComplete: () => {
        deletionToast.value = null
      },
    })
  }

  workingHeaders.value.splice(index, 1)
}

const clearContent = () => {
  // set headers list to the initial state
  workingHeaders.value = [
    {
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkHeaders.value = ""
}

const activeGQLHeadersCount = computed(
  () =>
    headers.value.filter((x) => x.active && (x.key !== "" || x.value !== ""))
      .length
)

const variableEditor = ref<any | null>(null)
const linewrapEnabledVariable = ref(true)

useCodemirror(
  variableEditor,
  variableString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      placeholder: `${t("request.variables")}`,
      lineWrapping: linewrapEnabledVariable,
    },
    linter: computed(() =>
      variableString.value.length > 0 ? jsonLinter : null
    ),
    completer: null,
    environmentHighlights: false,
  })
)

const queryEditor = ref<any | null>(null)
const schema = useReadonlyStream(props.conn.schema$, null, "noclone")
const linewrapEnabledQuery = ref(true)

useCodemirror(
  queryEditor,
  gqlQueryString,
  reactive({
    extendedEditorConfig: {
      mode: "graphql",
      placeholder: `${t("request.query")}`,
      lineWrapping: linewrapEnabledQuery,
    },
    linter: createGQLQueryLinter(schema),
    completer: queryCompleter(schema),
    environmentHighlights: false,
  })
)

const copyQueryIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)
const copyVariablesIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)
const prettifyQueryIcon = refAutoReset<
  typeof IconWand2 | typeof IconCheck | typeof IconInfo
>(IconWand2, 1000)
const prettifyVariablesIcon = refAutoReset<
  typeof IconWand2 | typeof IconCheck | typeof IconInfo
>(IconWand2, 1000)

const showSaveRequestModal = ref(false)

const copyQuery = () => {
  copyToClipboard(gqlQueryString.value)
  copyQueryIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const response = useStream(gqlResponse$, "", setGQLResponse)

const runQuery = async () => {
  const startTime = Date.now()

  startPageProgress()
  response.value = "loading"

  try {
    const runURL = clone(url.value)
    const runHeaders = clone(headers.value)
    const runQuery = clone(gqlQueryString.value)
    const runVariables = clone(variableString.value)
    const runAuth = clone(auth.value)

    const responseText = await props.conn.runQuery(
      runURL,
      runHeaders,
      runQuery,
      runVariables,
      runAuth
    )
    const duration = Date.now() - startTime

    completePageProgress()

    response.value = JSON.stringify(JSON.parse(responseText), null, 2)

    addGraphqlHistoryEntry(
      makeGQLHistoryEntry({
        request: makeGQLRequest({
          name: "",
          url: runURL,
          query: runQuery,
          headers: runHeaders,
          variables: runVariables,
          auth: runAuth,
        }),
        response: response.value,
        star: false,
      })
    )

    toast.success(`${t("state.finished_in", { duration })}`)
  } catch (e: any) {
    response.value = `${e}`
    completePageProgress()

    toast.error(
      `${t("error.something_went_wrong")}. ${t("error.check_console_details")}`,
      {}
    )
    console.error(e)
  }

  logHoppRequestRunToAnalytics({
    platform: "graphql-query",
    strategy: getCurrentStrategyID(),
  })
}

const hideRequestModal = () => {
  showSaveRequestModal.value = false
}

const prettifyQuery = () => {
  try {
    gqlQueryString.value = gql.print(gql.parse(gqlQueryString.value))
    prettifyQueryIcon.value = IconCheck
  } catch (e) {
    toast.error(`${t("error.gql_prettify_invalid_query")}`)
    prettifyQueryIcon.value = IconInfo
  }
}

const saveRequest = () => {
  showSaveRequestModal.value = true
}

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

const clearGQLQuery = () => {
  gqlQueryString.value = ""
}

const clearGQLVariables = () => {
  variableString.value = ""
}

defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request.save", saveRequest)
defineActionHandler("request.reset", clearGQLQuery)
</script>
