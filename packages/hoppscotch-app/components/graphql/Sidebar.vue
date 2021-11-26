<template>
  <SmartTabs styles="sticky bg-primary z-10 top-0" vertical>
    <SmartTab
      :id="'history'"
      icon="clock"
      :label="`${t('tab.history')}`"
      :selected="true"
    >
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
      <AppSection label="docs">
        <div
          v-if="
            queryFields.length === 0 &&
            mutationFields.length === 0 &&
            subscriptionFields.length === 0 &&
            graphqlTypes.length === 0
          "
          class="
            flex
            text-secondaryLight
            flex-col
            items-center
            justify-center
            p-4
          "
        >
          <img
            :src="`/images/states/${$colorMode.value}/add_comment.svg`"
            loading="lazy"
            class="
              object-contain
              inline-flex
              flex-col
              object-center
              w-16
              h-16
              my-4
            "
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
              class="flex w-full p-4 py-2 bg-transparent"
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
            ref="gqlTabs"
            styles="border-t border-b border-dividerLight bg-primary sticky z-10 top-sidebarPrimaryStickyFold"
          >
            <div class="gqlTabs">
              <SmartTab
                v-if="queryFields.length > 0"
                :id="'queries'"
                :label="`${t('tab.queries')}`"
                :selected="true"
                class="divide-dividerLight divide-y"
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
                class="divide-dividerLight divide-y"
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
                class="divide-dividerLight divide-y"
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
                ref="typesTab"
                :label="`${t('tab.types')}`"
                class="divide-dividerLight divide-y"
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
            </div>
          </SmartTabs>
        </div>
      </AppSection>
    </SmartTab>

    <SmartTab :id="'schema'" icon="box" :label="`${t('tab.schema')}`">
      <AppSection ref="schema" label="schema">
        <div
          v-if="schemaString"
          class="
            bg-primary
            border-dividerLight
            sticky
            top-0
            z-10
            flex
            items-center
            justify-between
            flex-1
            pl-4
            border-b
          "
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
              svg="corner-down-left"
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
        <div v-if="schemaString" ref="schemaEditor"></div>
        <div
          v-else
          class="
            flex
            text-secondaryLight
            flex-col
            items-center
            justify-center
            p-4
          "
        >
          <img
            :src="`/images/states/${$colorMode.value}/blockchain.svg`"
            loading="lazy"
            class="
              object-contain
              inline-flex
              flex-col
              object-center
              w-16
              h-16
              my-4
            "
            :alt="`${t('empty.schema')}`"
          />
          <span class="mb-4 text-center">
            {{ t("empty.schema") }}
          </span>
        </div>
      </AppSection>
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "@nuxtjs/composition-api"
import { GraphQLField, GraphQLType } from "graphql"
import { map } from "rxjs/operators"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { GQLConnection } from "~/helpers/GQLConnection"
import { GQLHeader } from "~/helpers/types/HoppGQLRequest"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import {
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLURL,
  setGQLVariables,
} from "~/newstore/GQLSession"

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

const downloadSchemaIcon = ref("download")
const copySchemaIcon = ref("copy")

const graphqlFieldsFilterText = ref("")

const gqlTabs = ref<any | null>(null)
const typesTab = ref<any | null>(null)

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
  gqlTabs.value.selectTab(typesTab.value)
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
    downloadSchemaIcon.value = "download"
  }, 1000)
}

const copySchema = () => {
  if (!schemaString.value) return

  copyToClipboard(schemaString.value)
  copySchemaIcon.value = "check"
  setTimeout(() => (copySchemaIcon.value = "copy"), 1000)
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
  props.conn.reset()
}
</script>
