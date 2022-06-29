<template>
  <SmartTabs
    v-model="selectedNavigationTab"
    styles="sticky bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <SmartTab :id="'history'" icon="clock" :label="`${t('tab.history')}`">
      <History
        ref="graphqlHistoryComponent"
        :page="'graphql'"
        @useHistory="handleUseHistory"
      />
    </SmartTab>
    <SmartTab
      :id="'collections'"
      icon="folder"
      :label="`${t('tab.collections')}`"
    >
      <CollectionsGraphql />
    </SmartTab>
    <SmartTab
      :id="'docs'"
      icon="book-open"
      :label="`${t('tab.documentation')}`"
    >
      <div
        v-if="
          queryFields.length === 0 &&
          mutationFields.length === 0 &&
          subscriptionFields.length === 0 &&
          graphqlTypes.length === 0
        "
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${$colorMode.value}/add_comment.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.documentation')}`"
        />
        <span class="mb-4 text-center">
          {{ t("empty.documentation") }}
        </span>
      </div>
      <div v-else>
        <div class="sticky top-0 z-10 flex bg-primary">
          <input
            v-model="graphqlFieldsFilterText"
            type="search"
            autocomplete="off"
            :placeholder="`${t('action.search')}`"
            class="flex flex-1 p-4 py-2 bg-transparent"
          />
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/quickstart/graphql"
              blank
              :title="t('app.wiki')"
              svg="help-circle"
            />
          </div>
        </div>
        <SmartTabs
          v-model="selectedGqlTab"
          styles="border-t border-b border-dividerLight bg-primary sticky z-10 top-sidebarPrimaryStickyFold"
          render-inactive-tabs
        >
          <SmartTab
            v-if="queryFields.length > 0"
            :id="'queries'"
            :label="`${t('tab.queries')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlField
              v-for="(field, index) in filteredQueryFields"
              :key="`field-${index}`"
              :gql-field="field"
              :jump-type-callback="handleJumpToType"
              class="p-4"
            />
          </SmartTab>
          <SmartTab
            v-if="mutationFields.length > 0"
            :id="'mutations'"
            :label="`${t('graphql.mutations')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlField
              v-for="(field, index) in filteredMutationFields"
              :key="`field-${index}`"
              :gql-field="field"
              :jump-type-callback="handleJumpToType"
              class="p-4"
            />
          </SmartTab>
          <SmartTab
            v-if="subscriptionFields.length > 0"
            :id="'subscriptions'"
            :label="`${t('graphql.subscriptions')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlField
              v-for="(field, index) in filteredSubscriptionFields"
              :key="`field-${index}`"
              :gql-field="field"
              :jump-type-callback="handleJumpToType"
              class="p-4"
            />
          </SmartTab>
          <SmartTab
            v-if="graphqlTypes.length > 0"
            :id="'types'"
            :label="`${t('tab.types')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlType
              v-for="(type, index) in filteredGraphqlTypes"
              :key="`type-${index}`"
              :gql-type="type"
              :gql-types="graphqlTypes"
              :is-highlighted="isGqlTypeHighlighted(type)"
              :highlighted-fields="getGqlTypeHighlightedFields(type)"
              :jump-type-callback="handleJumpToType"
            />
          </SmartTab>
        </SmartTabs>
      </div>
    </SmartTab>
    <SmartTab :id="'schema'" icon="box" :label="`${t('tab.schema')}`">
      <div
        v-if="schemaString"
        class="sticky top-0 z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
      >
        <label class="font-semibold text-secondaryLight">
          {{ t("graphql.schema") }}
        </label>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/quickstart/graphql"
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
            ref="downloadSchema"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :svg="downloadSchemaIcon"
            @click.native="downloadSchema"
          />
          <ButtonSecondary
            ref="copySchemaCode"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :svg="copySchemaIcon"
            @click.native="copySchema"
          />
        </div>
      </div>
      <div
        v-if="schemaString"
        ref="schemaEditor"
        class="flex flex-col flex-1"
      ></div>
      <div
        v-else
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${$colorMode.value}/blockchain.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.schema')}`"
        />
        <span class="mb-4 text-center">
          {{ t("empty.schema") }}
        </span>
      </div>
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "@nuxtjs/composition-api"
import { GraphQLField, GraphQLType } from "graphql"
import { map } from "rxjs/operators"
import { GQLHeader } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { GQLConnection } from "~/helpers/GQLConnection"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import {
  setGQLAuth,
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLURL,
  setGQLVariables,
} from "~/newstore/GQLSession"

type NavigationTabs = "history" | "collection" | "docs" | "schema"
type GqlTabs = "queries" | "mutations" | "subscriptions" | "types"

const selectedNavigationTab = ref<NavigationTabs>("history")
const selectedGqlTab = ref<GqlTabs>("queries")

const t = useI18n()

function isTextFoundInGraphqlFieldObject(
  text: string,
  field: GraphQLField<any, any>
) {
  const normalizedText = text.toLowerCase()

  const isFilterTextFoundInDescription = field.description
    ? field.description.toLowerCase().includes(normalizedText)
    : false
  const isFilterTextFoundInName = field.name
    .toLowerCase()
    .includes(normalizedText)

  return isFilterTextFoundInDescription || isFilterTextFoundInName
}

function getFilteredGraphqlFields(
  filterText: string,
  fields: GraphQLField<any, any>[]
) {
  if (!filterText) return fields

  return fields.filter((field) =>
    isTextFoundInGraphqlFieldObject(filterText, field)
  )
}

function getFilteredGraphqlTypes(filterText: string, types: GraphQLType[]) {
  if (!filterText) return types

  return types.filter((type) => {
    const isFilterTextMatching = isTextFoundInGraphqlFieldObject(
      filterText,
      type as any
    )

    if (isFilterTextMatching) {
      return true
    }

    const isFilterTextMatchingAtLeastOneField = Object.values(
      (type as any)._fields || {}
    ).some((field) => isTextFoundInGraphqlFieldObject(filterText, field as any))

    return isFilterTextMatchingAtLeastOneField
  })
}

function resolveRootType(type: GraphQLType) {
  let t: any = type
  while (t.ofType) t = t.ofType
  return t
}

type GQLHistoryEntry = {
  url: string
  headers: GQLHeader[]
  query: string
  response: string
  variables: string
}

const props = defineProps<{
  conn: GQLConnection
}>()

const toast = useToast()

const queryFields = useReadonlyStream(
  props.conn.queryFields$.pipe(map((x) => x ?? [])),
  []
)

const mutationFields = useReadonlyStream(
  props.conn.mutationFields$.pipe(map((x) => x ?? [])),
  []
)

const subscriptionFields = useReadonlyStream(
  props.conn.subscriptionFields$.pipe(map((x) => x ?? [])),
  []
)

const graphqlTypes = useReadonlyStream(
  props.conn.graphqlTypes$.pipe(map((x) => x ?? [])),
  []
)

const downloadSchemaIcon = refAutoReset<"download" | "check">("download", 1000)
const copySchemaIcon = refAutoReset<"copy" | "check">("copy", 1000)

const graphqlFieldsFilterText = ref("")

const filteredQueryFields = computed(() => {
  return getFilteredGraphqlFields(
    graphqlFieldsFilterText.value,
    queryFields.value as any
  )
})

const filteredMutationFields = computed(() => {
  return getFilteredGraphqlFields(
    graphqlFieldsFilterText.value,
    mutationFields.value as any
  )
})

const filteredSubscriptionFields = computed(() => {
  return getFilteredGraphqlFields(
    graphqlFieldsFilterText.value,
    subscriptionFields.value as any
  )
})

const filteredGraphqlTypes = computed(() => {
  return getFilteredGraphqlTypes(
    graphqlFieldsFilterText.value,
    graphqlTypes.value as any
  )
})

const isGqlTypeHighlighted = (gqlType: GraphQLType) => {
  if (!graphqlFieldsFilterText.value) return false

  return isTextFoundInGraphqlFieldObject(
    graphqlFieldsFilterText.value,
    gqlType as any
  )
}

const getGqlTypeHighlightedFields = (gqlType: GraphQLType) => {
  if (!graphqlFieldsFilterText.value) return []

  const fields = Object.values((gqlType as any)._fields || {})
  if (!fields || fields.length === 0) return []

  return fields.filter((field) =>
    isTextFoundInGraphqlFieldObject(graphqlFieldsFilterText.value, field as any)
  )
}

const handleJumpToType = async (type: GraphQLType) => {
  selectedGqlTab.value = "types"
  await nextTick()

  const rootTypeName = resolveRootType(type).name
  const target = document.getElementById(`type_${rootTypeName}`)
  if (target) {
    target.scrollIntoView({ block: "center", behavior: "smooth" })
    target.classList.add(
      "transition-all",
      "ring-inset",
      "ring-accentLight",
      "ring-4"
    )
    setTimeout(
      () =>
        target.classList.remove(
          "ring-inset",
          "ring-accentLight",
          "ring-4",
          "transition-all"
        ),
      2000
    )
  }
}

const schemaString = useReadonlyStream(
  props.conn.schemaString$.pipe(map((x) => x ?? "")),
  ""
)

const schemaEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  schemaEditor,
  schemaString,
  reactive({
    extendedEditorConfig: {
      mode: "graphql",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const downloadSchema = () => {
  const dataToWrite = JSON.stringify(schemaString.value, null, 2)
  const file = new Blob([dataToWrite], { type: "application/graphql" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}.graphql`
  document.body.appendChild(a)
  a.click()
  downloadSchemaIcon.value = "check"
  toast.success(`${t("state.download_started")}`)
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

const copySchema = () => {
  if (!schemaString.value) return

  copyToClipboard(schemaString.value)
  copySchemaIcon.value = "check"
}

const handleUseHistory = (entry: GQLHistoryEntry) => {
  const url = entry.url
  const headers = entry.headers
  const gqlQueryString = entry.query
  const variableString = entry.variables
  const responseText = entry.response

  setGQLURL(url)
  setGQLHeaders(headers)
  setGQLQuery(gqlQueryString)
  setGQLVariables(variableString)
  setGQLResponse(responseText)
  setGQLAuth({
    authType: "none",
    authActive: true,
  })
  props.conn.reset()
}
</script>
