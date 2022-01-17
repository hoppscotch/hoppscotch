<template>
  <div>
    <SmartTabs styles="sticky bg-primary top-upperPrimaryStickyFold z-10">
      <SmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :selected="true"
        :indicator="gqlQueryString && gqlQueryString.length > 0 ? true : false"
      >
        <div
          class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold gqlRunQuery"
        >
          <label class="font-semibold text-secondaryLight">
            {{ t("request.query") }}
          </label>
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
              :title="`${t(
                'request.run'
              )} <kbd>${getSpecialKey()}</kbd><kbd>G</kbd>`"
              :label="`${t('request.run')}`"
              svg="play"
              class="rounded-none !text-accent !hover:text-accentDark"
              @click.native="runQuery()"
            />
            <ButtonSecondary
              ref="saveRequest"
              v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
              :title="`${t(
                'request.save'
              )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
              :label="`${t('request.save')}`"
              svg="save"
              class="rounded-none"
              @click.native="saveRequest"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/graphql"
              blank
              :title="t('app.wiki')"
              svg="help-circle"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              svg="trash-2"
              @click.native="clearGQLQuery()"
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
      </SmartTab>

      <SmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="variableString && variableString.length > 0 ? true : false"
      >
        <div
          class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
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
              svg="help-circle"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              svg="trash-2"
              @click.native="clearGQLVariables()"
            />
            <ButtonSecondary
              ref="prettifyRequest"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.prettify')"
              :svg="prettifyVariablesIcon"
              @click.native="prettifyVariableString"
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
      </SmartTab>

      <SmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <div
          class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
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
              @click.native="addHeader"
            />
          </div>
        </div>
        <div v-if="bulkMode" ref="bulkEditor"></div>
        <div v-else>
          <div
            v-for="(header, index) in workingHeaders"
            :key="`header-${String(index)}`"
            class="flex border-b divide-x divide-dividerLight border-dividerLight"
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
              class="flex-1 !flex"
              @input="
                updateHeader(index, {
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
                  updateHeader(index, {
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
                @click.native="deleteHeader(index)"
              />
            </span>
          </div>
          <div
            v-if="workingHeaders.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${$colorMode.value}/add_category.svg`"
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
              svg="plus"
              class="mb-4"
              @click.native="addHeader"
            />
          </div>
        </div>
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
import { Ref, computed, reactive, ref, watch } from "@nuxtjs/composition-api"
import clone from "lodash/clone"
import * as gql from "graphql"
import { GQLHeader, makeGQLRequest } from "@hoppscotch/data"
import isEqual from "lodash/isEqual"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  useNuxt,
  useReadonlyStream,
  useStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import {
  gqlHeaders$,
  gqlQuery$,
  gqlResponse$,
  gqlURL$,
  gqlVariables$,
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
import { useCodemirror } from "~/helpers/editor/codemirror"
import jsonLinter from "~/helpers/editor/linting/json"
import { createGQLQueryLinter } from "~/helpers/editor/linting/gqlQuery"
import queryCompleter from "~/helpers/editor/completion/gqlQuery"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"

const t = useI18n()

const props = defineProps<{
  conn: GQLConnection
}>()

const toast = useToast()
const nuxt = useNuxt()

const url = useReadonlyStream(gqlURL$, "")
const gqlQueryString = useStream(gqlQuery$, "", setGQLQuery)
const variableString = useStream(gqlVariables$, "", setGQLVariables)

const bulkMode = ref(false)
const bulkHeaders = ref("")
const bulkEditor = ref<any | null>(null)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(bulkEditor, bulkHeaders, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter: null,
  completer: null,
  environmentHighlights: false,
})

// The functional headers list (the headers actually in the system)
const headers = useStream(gqlHeaders$, [], setGQLHeaders) as Ref<GQLHeader[]>

// The UI representation of the headers list (has the empty end header)
const workingHeaders = ref<GQLHeader[]>([
  {
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
    const filteredWorkingHeaders = workingHeaders.value.filter(
      (e) => e.key !== ""
    )

    if (!isEqual(newHeadersList, filteredWorkingHeaders)) {
      workingHeaders.value = newHeadersList
    }
  },
  { immediate: true }
)

watch(workingHeaders, (newWorkingHeaders) => {
  const fixedHeaders = newWorkingHeaders.filter((e) => e.key !== "")
  if (!isEqual(headers.value, fixedHeaders)) {
    headers.value = fixedHeaders
  }
})

// Bulk Editor Syncing with Working Headers
watch(bulkHeaders, () => {
  try {
    const transformation = bulkHeaders.value
      .split("\n")
      .filter((x) => x.trim().length > 0 && x.includes(":"))
      .map((item) => ({
        key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^#/, ""),
        value: item.substring(item.indexOf(":") + 1).trimLeft(),
        active: !item.trim().startsWith("#"),
      }))

    const filteredHeaders = workingHeaders.value.filter((x) => x.key !== "")

    if (!isEqual(filteredHeaders, transformation)) {
      workingHeaders.value = transformation
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
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
      bulkHeaders.value = filteredHeaders
        .map((header) => {
          return `${header.active ? "" : "#"}${header.key}: ${header.value}`
        })
        .join("\n")
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

const addHeader = () => {
  workingHeaders.value.push({
    key: "",
    value: "",
    active: true,
  })
}

const updateHeader = (index: number, header: GQLHeader) => {
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

const queryEditor = ref<any | null>(null)
const schemaString = useReadonlyStream(props.conn.schema$, null)

useCodemirror(queryEditor, gqlQueryString, {
  extendedEditorConfig: {
    mode: "graphql",
    placeholder: `${t("request.query")}`,
  },
  linter: createGQLQueryLinter(schemaString),
  completer: queryCompleter(schemaString),
  environmentHighlights: false,
})

const copyQueryIcon = ref("copy")
const copyVariablesIcon = ref("copy")
const prettifyQueryIcon = ref("wand")
const prettifyVariablesIcon = ref("wand")

const showSaveRequestModal = ref(false)

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

const prettifyVariableString = () => {
  try {
    const jsonObj = JSON.parse(variableString.value)
    variableString.value = JSON.stringify(jsonObj, null, 2)
    prettifyVariablesIcon.value = "check"
  } catch (e) {
    console.error(e)
    prettifyVariablesIcon.value = "info"
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
  setTimeout(() => (prettifyVariablesIcon.value = "wand"), 1000)
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
