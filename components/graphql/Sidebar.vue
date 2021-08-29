<template>
  <aside>
    <SmartTabs styles="sticky bg-primary z-10 top-0">
      <SmartTab :id="'docs'" :label="`Docs`" :selected="true">
        <AppSection label="docs">
          <div class="bg-primary flex top-sidebarPrimaryStickyFold z-10 sticky">
            <input
              v-model="graphqlFieldsFilterText"
              type="search"
              :placeholder="$t('action.search')"
              class="bg-transparent flex w-full p-4 py-2"
            />
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/quickstart/graphql"
                blank
                :title="$t('app.wiki')"
                svg="help-circle"
              />
            </div>
          </div>
          <SmartTabs
            ref="gqlTabs"
            styles="border-t border-dividerLight bg-primary sticky z-10 top-sidebarSecondaryStickyFold"
          >
            <div class="gqlTabs">
              <SmartTab
                v-if="queryFields.length > 0"
                :id="'queries'"
                :label="$t('tab.queries')"
                :selected="true"
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
                :label="$t('graphql.mutations')"
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
                :label="$t('graphql.subscriptions')"
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
                ref="typesTab"
                :label="$t('tab.types')"
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
            </div>
          </SmartTabs>
          <div
            v-if="
              queryFields.length === 0 &&
              mutationFields.length === 0 &&
              subscriptionFields.length === 0 &&
              graphqlTypes.length === 0
            "
            class="
              flex flex-col
              text-secondaryLight
              p-4
              items-center
              justify-center
            "
          >
            <i class="opacity-75 pb-2 material-icons">link</i>
            <span class="text-center">
              {{ $t("empty.schema") }}
            </span>
          </div>
        </AppSection>
      </SmartTab>

      <SmartTab :id="'history'" :label="$t('tab.history')">
        <History
          ref="graphqlHistoryComponent"
          :page="'graphql'"
          @useHistory="handleUseHistory"
        />
      </SmartTab>

      <SmartTab :id="'collections'" :label="$t('tab.collections')">
        <CollectionsGraphql />
      </SmartTab>

      <SmartTab :id="'schema'" :label="`Schema`">
        <AppSection ref="schema" label="schema">
          <div
            v-if="schemaString"
            class="
              bg-primary
              flex flex-1
              top-sidebarPrimaryStickyFold
              pl-4
              z-10
              sticky
              items-center
              justify-between
            "
          >
            <label class="font-semibold text-secondaryLight">
              {{ $t("graphql.schema") }}
            </label>
            <div class="flex">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/quickstart/graphql"
                blank
                :title="$t('app.wiki')"
                svg="help-circle"
              />
              <ButtonSecondary
                ref="downloadSchema"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.download_file')"
                :svg="downloadSchemaIcon"
                @click.native="downloadSchema"
              />
              <ButtonSecondary
                ref="copySchemaCode"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.copy')"
                :svg="copySchemaIcon"
                @click.native="copySchema"
              />
            </div>
          </div>
          <SmartAceEditor
            v-if="schemaString"
            v-model="schemaString"
            :lang="'graphqlschema'"
            :options="{
              maxLines: Infinity,
              minLines: 16,
              autoScrollEditorIntoView: true,
              readOnly: true,
              showPrintMargin: false,
              useWorker: false,
            }"
            styles="border-b border-dividerLight"
          />
          <div
            v-else
            class="
              flex flex-col
              text-secondaryLight
              p-4
              items-center
              justify-center
            "
          >
            <i class="opacity-75 pb-2 material-icons">link</i>
            <span class="text-center">
              {{ $t("empty.schema") }}
            </span>
          </div>
        </AppSection>
      </SmartTab>
    </SmartTabs>
  </aside>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  PropType,
  ref,
  useContext,
} from "@nuxtjs/composition-api"
import { GraphQLField, GraphQLType } from "graphql"
import { map } from "rxjs/operators"
import { GQLConnection } from "~/helpers/GQLConnection"
import { GQLHeader } from "~/helpers/types/HoppGQLRequest"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLURL,
  setGQLVariables,
} from "~/newstore/GQLSession"

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

export default defineComponent({
  props: {
    conn: {
      type: Object as PropType<GQLConnection>,
      required: true,
    },
  },
  setup(props) {
    const {
      $toast,
      app: { i18n },
    } = useContext()
    const t = i18n.t.bind(i18n)

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
        isTextFoundInGraphqlFieldObject(
          graphqlFieldsFilterText.value,
          field as any
        )
      )
    }

    const handleJumpToType = async (type: GraphQLType) => {
      gqlTabs.value.selectTab(typesTab.value)
      await nextTick()

      const rootTypeName = resolveRootType(type).name

      const target = document.getElementById(`type_${rootTypeName}`)
      if (target) {
        gqlTabs.value.$el
          .querySelector(".gqlTabs")
          .scrollTo({ top: target.offsetTop, behavior: "smooth" })
      }
    }
    const schemaString = useReadonlyStream(
      props.conn.schemaString$.pipe(map((x) => x ?? "")),
      ""
    )

    const downloadSchema = () => {
      const dataToWrite = JSON.stringify(schemaString.value, null, 2)
      const file = new Blob([dataToWrite], { type: "application/graphql" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      a.download = `${
        url.split("/").pop()!.split("#")[0].split("?")[0]
      }.graphql`
      document.body.appendChild(a)
      a.click()
      downloadSchemaIcon.value = "check"
      $toast.success(t("state.download_started").toString(), {
        icon: "downloading",
      })
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

    return {
      queryFields,
      mutationFields,
      subscriptionFields,
      graphqlTypes,
      schemaString,

      graphqlFieldsFilterText,

      filteredQueryFields,
      filteredMutationFields,
      filteredSubscriptionFields,
      filteredGraphqlTypes,

      isGqlTypeHighlighted,
      getGqlTypeHighlightedFields,

      gqlTabs,
      typesTab,
      handleJumpToType,

      downloadSchema,
      downloadSchemaIcon,
      copySchemaIcon,
      copySchema,
      handleUseHistory,
    }
  },
})
</script>
