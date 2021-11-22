<template>
  <div>
    <SmartTabs styles="sticky bg-primary top-upperPrimaryStickyFold z-10">
      <template #actions>
        <ButtonSecondary
          :label="`${t('request.run')}`"
          svg="play"
          class="rounded-none !text-accent"
          @click.native="runQuery()"
        />
        <ButtonSecondary
          ref="saveRequest"
          :label="`${t('request.save')}`"
          class="rounded-none"
          @click.native="saveRequest"
        />
      </template>

      <SmartTab :id="'query'" :label="`${t('tab.query')}`" :selected="true">
        <AppSection label="query">
          <div
            class="
              bg-primary
              border-b border-dividerLight
              flex flex-1
              top-upperSecondaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
              gqlRunQuery
            "
          >
            <label class="font-semibold text-secondaryLight">
              {{ t("request.query") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/graphql/#queries"
                blank
                :title="t('app.wiki')"
                svg="help-circle"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.prettify')"
                :svg="`${prettifyQueryIcon}`"
                @click.native="prettifyQuery"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.copy')"
                :svg="`${copyQueryIcon}`"
                @click.native="copyQuery"
              />
            </div>
          </div>
          <div ref="queryEditor"></div>
        </AppSection>
      </SmartTab>

      <SmartTab :id="'variables'" :label="`${t('tab.variables')}`">
        <AppSection label="variables">
          <div
            class="
              bg-primary
              border-b border-dividerLight
              flex flex-1
              top-upperSecondaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
            "
          >
            <label class="font-semibold text-secondaryLight">
              {{ t("request.variables") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/graphql/#queries"
                blank
                :title="t('app.wiki')"
                svg="help-circle"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.copy')"
                :svg="`${copyVariablesIcon}`"
                @click.native="copyVariables"
              />
            </div>
          </div>
          <div ref="variableEditor"></div>
        </AppSection>
      </SmartTab>

      <SmartTab :id="'headers'" :label="`${t('tab.headers')}`">
        <AppSection label="headers">
          <div
            class="
              bg-primary
              border-b border-dividerLight
              flex flex-1
              top-upperSecondaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
            "
          >
            <label class="font-semibold text-secondaryLight">
              {{ t("tab.headers") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/graphql/#headers"
                blank
                :title="t('app.wiki')"
                svg="help-circle"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear_all')"
                svg="trash-2"
                @click.native="clearContent()"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('state.bulk_mode')"
                svg="edit"
                :class="{ '!text-accent': bulkMode }"
                @click.native="bulkMode = !bulkMode"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('add.new')"
                svg="plus"
                :disabled="bulkMode"
                @click.native="addRequestHeader"
              />
            </div>
          </div>
          <div v-if="bulkMode" ref="bulkEditor"></div>
          <div v-else>
            <div
              v-for="(header, index) in headers"
              :key="`header-${String(index)}`"
              class="
                divide-x divide-dividerLight
                border-b border-dividerLight
                flex
              "
            >
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
                class="!flex flex-1"
                @input="
                  updateRequestHeader(index, {
                    key: $event,
                    value: header.value,
                    active: header.active,
                  })
                "
              />
              <input
                class="bg-transparent flex flex-1 py-2 px-4"
                :placeholder="`${t('count.value', { count: index + 1 })}`"
                :name="`value ${String(index)}`"
                :value="header.value"
                autofocus
                @change="
                  updateRequestHeader(index, {
                    key: header.key,
                    value: $event.target.value,
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
                  :svg="
                    header.hasOwnProperty('active')
                      ? header.active
                        ? 'check-circle'
                        : 'circle'
                      : 'check-circle'
                  "
                  color="green"
                  @click.native="
                    updateRequestHeader(index, {
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
                  svg="trash"
                  color="red"
                  @click.native="removeRequestHeader(index)"
                />
              </span>
            </div>
            <div
              v-if="headers.length === 0"
              class="
                flex flex-col
                text-secondaryLight
                p-4
                items-center
                justify-center
              "
            >
              <img
                :src="`/images/states/${$colorMode.value}/add_category.svg`"
                loading="lazy"
                class="
                  flex-col
                  my-4
                  object-contain object-center
                  h-16
                  w-16
                  inline-flex
                "
                :alt="`${t('empty.headers')}`"
              />
              <span class="text-center pb-4">
                {{ t("empty.headers") }}
              </span>
              <ButtonSecondary
                :label="`${t('add.new')}`"
                filled
                svg="plus"
                class="mb-4"
                @click.native="addRequestHeader"
              />
            </div>
          </div>
        </AppSection>
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
import { onMounted, ref, watch } from "@nuxtjs/composition-api"
import clone from "lodash/clone"
import * as gql from "graphql"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  useNuxt,
  useReadonlyStream,
  useStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import {
  addGQLHeader,
  gqlHeaders$,
  gqlQuery$,
  gqlResponse$,
  gqlURL$,
  gqlVariables$,
  removeGQLHeader,
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLVariables,
  updateGQLHeader,
} from "~/newstore/GQLSession"
import { commonHeaders } from "~/helpers/headers"
import { GQLConnection } from "~/helpers/GQLConnection"
import { makeGQLHistoryEntry, addGraphqlHistoryEntry } from "~/newstore/history"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { getCurrentStrategyID } from "~/helpers/network"
import { GQLHeader, makeGQLRequest } from "~/helpers/types/HoppGQLRequest"
import { useCodemirror } from "~/helpers/editor/codemirror"
import jsonLinter from "~/helpers/editor/linting/json"
import { createGQLQueryLinter } from "~/helpers/editor/linting/gqlQuery"
import queryCompleter from "~/helpers/editor/completion/gqlQuery"

const t = useI18n()

const props = defineProps<{
  conn: GQLConnection
}>()

const toast = useToast()

const nuxt = useNuxt()

const bulkMode = ref(false)
const bulkHeaders = ref("")

watch(bulkHeaders, () => {
  try {
    const transformation = bulkHeaders.value.split("\n").map((item) => ({
      key: item.substring(0, item.indexOf(":")).trim().replace(/^\/\//, ""),
      value: item.substring(item.indexOf(":") + 1).trim(),
      active: !item.trim().startsWith("//"),
    }))
    setGQLHeaders(transformation as GQLHeader[])
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

const url = useReadonlyStream(gqlURL$, "")
const gqlQueryString = useStream(gqlQuery$, "", setGQLQuery)
const variableString = useStream(gqlVariables$, "", setGQLVariables)
const headers = useStream(gqlHeaders$, [], setGQLHeaders)

const bulkEditor = ref<any | null>(null)

useCodemirror(bulkEditor, bulkHeaders, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter: null,
  completer: null,
})

const variableEditor = ref<any | null>(null)

useCodemirror(variableEditor, variableString, {
  extendedEditorConfig: {
    mode: "application/ld+json",
    placeholder: `${t("request.variables")}`,
  },
  linter: jsonLinter,
  completer: null,
})

const queryEditor = ref<any | null>(null)
const schemaString = useReadonlyStream(props.conn.schema$, null)

useCodemirror(queryEditor, gqlQueryString, {
  extendedEditorConfig: {
    mode: "graphql",
    placeholder: `${t("request.query")}`,
  },
  linter: createGQLQueryLinter(schemaString),
  completer: queryCompleter(schemaString),
})

const copyQueryIcon = ref("copy")
const prettifyQueryIcon = ref("wand")
const copyVariablesIcon = ref("copy")

const showSaveRequestModal = ref(false)

watch(
  headers,
  () => {
    if (!bulkMode.value)
      if (
        (headers.value[headers.value.length - 1]?.key !== "" ||
          headers.value[headers.value.length - 1]?.value !== "") &&
        headers.value.length
      )
        addRequestHeader()
  },
  { deep: true }
)

const editBulkHeadersLine = (index: number, item?: GQLHeader | null) => {
  bulkHeaders.value = headers.value
    .reduce((all, header, pIndex) => {
      const current =
        index === pIndex && item != null
          ? `${item.active ? "" : "//"}${item.key}: ${item.value}`
          : `${header.active ? "" : "//"}${header.key}: ${header.value}`
      return [...all, current]
    }, [])
    .join("\n")
}

const clearBulkEditor = () => {
  bulkHeaders.value = ""
}

onMounted(() => {
  if (!headers.value?.length) {
    addRequestHeader()
  }
})

const copyQuery = () => {
  copyToClipboard(gqlQueryString.value)
  copyQueryIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyQueryIcon.value = "copy"), 1000)
}

const response = useStream(gqlResponse$, "", setGQLResponse)

const runQuery = async () => {
  const startTime = Date.now()

  nuxt.value.$loading.start()
  response.value = "loading"

  try {
    const runURL = clone(url.value)
    const runHeaders = clone(headers.value)
    const runQuery = clone(gqlQueryString.value)
    const runVariables = clone(variableString.value)

    const responseText = await props.conn.runQuery(
      runURL,
      runHeaders,
      runQuery,
      runVariables
    )
    const duration = Date.now() - startTime

    nuxt.value.$loading.finish()

    response.value = JSON.stringify(JSON.parse(responseText), null, 2)

    addGraphqlHistoryEntry(
      makeGQLHistoryEntry({
        request: makeGQLRequest({
          name: "",
          url: runURL,
          query: runQuery,
          headers: runHeaders,
          variables: runVariables,
        }),
        response: response.value,
        star: false,
      })
    )

    toast.success(`${t("state.finished_in", { duration })}`)
  } catch (e: any) {
    response.value = `${e}`
    nuxt.value.$loading.finish()

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
    prettifyQueryIcon.value = "check"
  } catch (e) {
    toast.error(`${t("error.gql_prettify_invalid_query")}`)
    prettifyQueryIcon.value = "info"
  }
  setTimeout(() => (prettifyQueryIcon.value = "wand"), 1000)
}

const saveRequest = () => {
  showSaveRequestModal.value = true
}

const copyVariables = () => {
  copyToClipboard(variableString.value)
  copyVariablesIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyVariablesIcon.value = "copy"), 1000)
}

const addRequestHeader = () => {
  const empty = { key: "", value: "", active: true }
  const index = headers.value.length

  addGQLHeader(empty)
  editBulkHeadersLine(index, empty)
}

const updateRequestHeader = (
  index: number,
  item: { key: string; value: string; active: boolean }
) => {
  updateGQLHeader(index, item)
  editBulkHeadersLine(index, item)
}

const removeRequestHeader = (index: number) => {
  const headersBeforeDeletion = headers.value

  removeGQLHeader(index)
  editBulkHeadersLine(index, null)

  const deletedItem = headersBeforeDeletion[index]
  if (deletedItem.key || deletedItem.value) {
    toast.success(`${t("state.deleted")}`, {
      action: [
        {
          text: `${t("action.undo")}`,
          onClick: (_, toastObject) => {
            setGQLHeaders(headersBeforeDeletion as GQLHeader[])
            editBulkHeadersLine(index, deletedItem)
            toastObject.goAway(0)
          },
        },
      ],
    })
  }
}

const clearContent = () => {
  headers.value = []
  clearBulkEditor()
}
</script>
