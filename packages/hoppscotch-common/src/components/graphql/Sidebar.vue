<template>
  <HoppSmartTabs
    v-model="selectedNavigationTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary z-10 top-0"
    vertical
    render-inactive-tabs
  >
    <HoppSmartTab
      :id="'docs'"
      :icon="IconBookOpen"
      :label="`${t('tab.documentation')}`"
    >
      <HoppSmartPlaceholder
        v-if="
          queryFields.length === 0 &&
          mutationFields.length === 0 &&
          subscriptionFields.length === 0 &&
          graphqlTypes.length === 0
        "
        :src="`/images/states/${colorMode.value}/add_comment.svg`"
        :alt="`${t('empty.documentation')}`"
        :text="t('empty.documentation')"
      >
      </HoppSmartPlaceholder>
      <div v-else>
        <div
          class="sticky top-0 z-10 flex flex-shrink-0 overflow-x-auto bg-primary"
        >
          <input
            v-model="graphqlFieldsFilterText"
            type="search"
            autocomplete="off"
            class="flex w-full p-4 py-2 bg-transparent h-8"
            :placeholder="`${t('action.search')}`"
          />
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/protocols/graphql"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </div>
        </div>
        <HoppSmartTabs
          v-model="selectedGqlTab"
          styles="border-t border-b border-dividerLight bg-primary sticky overflow-x-auto flex-shrink-0 z-10 top-sidebarPrimaryStickyFold"
          render-inactive-tabs
        >
          <HoppSmartTab
            v-if="queryFields.length > 0"
            :id="'queries'"
            :label="`${t('tab.queries')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlField
              v-for="(field, index) in filteredQueryFields"
              :key="`field-${index}`"
              :gql-field="field"
              @jump-to-type="handleJumpToType"
              class="p-4"
            />
          </HoppSmartTab>
          <HoppSmartTab
            v-if="mutationFields.length > 0"
            :id="'mutations'"
            :label="`${t('graphql.mutations')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlField
              v-for="(field, index) in filteredMutationFields"
              :key="`field-${index}`"
              :gql-field="field"
              @jump-to-type="handleJumpToType"
              class="p-4"
            />
          </HoppSmartTab>
          <HoppSmartTab
            v-if="subscriptionFields.length > 0"
            :id="'subscriptions'"
            :label="`${t('graphql.subscriptions')}`"
            class="divide-y divide-dividerLight"
          >
            <GraphqlField
              v-for="(field, index) in filteredSubscriptionFields"
              :key="`field-${index}`"
              :gql-field="field"
              @jump-to-type="handleJumpToType"
              class="p-4"
            />
          </HoppSmartTab>
          <HoppSmartTab
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
              @jump-to-type="handleJumpToType"
            />
          </HoppSmartTab>
        </HoppSmartTabs>
      </div>
    </HoppSmartTab>
    <HoppSmartTab :id="'schema'" :icon="IconBox" :label="`${t('tab.schema')}`">
      <div
        v-if="schemaString"
        class="sticky top-0 z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight"
      >
        <label class="font-semibold truncate text-secondaryLight">
          {{ t("graphql.schema") }}
        </label>
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/documentation/protocols/graphql"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
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
            :title="t('action.download_file')"
            :icon="downloadSchemaIcon"
            @click="downloadSchema"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copySchemaIcon"
            @click="copySchema"
          />
        </div>
      </div>
      <div
        v-if="schemaString"
        ref="schemaEditor"
        class="flex flex-col flex-1"
      ></div>
      <HoppSmartPlaceholder
        v-else
        :src="`/images/states/${colorMode.value}/blockchain.svg`"
        :alt="`${t('empty.schema')}`"
        :text="t('empty.schema')"
      >
      </HoppSmartPlaceholder>
    </HoppSmartTab>

    <HoppSmartTab
      :id="'collections'"
      :icon="IconFolder"
      :label="`${t('tab.collections')}`"
    >
      <CollectionsGraphql />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'history'"
      :icon="IconClock"
      :label="`${t('tab.history')}`"
    >
      <History :page="'graphql'" />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import IconFolder from "~icons/lucide/folder"
import IconBookOpen from "~icons/lucide/book-open"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconWrapText from "~icons/lucide/wrap-text"
import IconDownload from "~icons/lucide/download"
import IconCheck from "~icons/lucide/check"
import IconClock from "~icons/lucide/clock"
import IconCopy from "~icons/lucide/copy"
import IconBox from "~icons/lucide/box"
import { computed, nextTick, reactive, ref } from "vue"
import { GraphQLField, GraphQLType } from "graphql"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { copyToClipboard } from "@helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import {
  graphqlTypes,
  mutationFields,
  queryFields,
  schemaString,
  subscriptionFields,
} from "~/helpers/graphql/connection"
import { platform } from "~/platform"

type NavigationTabs = "history" | "collection" | "docs" | "schema"
type GqlTabs = "queries" | "mutations" | "subscriptions" | "types"

const selectedNavigationTab = ref<NavigationTabs>("docs")
const selectedGqlTab = ref<GqlTabs>("queries")

const t = useI18n()
const colorMode = useColorMode()

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

const toast = useToast()

const downloadSchemaIcon = refAutoReset<typeof IconDownload | typeof IconCheck>(
  IconDownload,
  1000
)
const copySchemaIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

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

const downloadSchema = async () => {
  const dataToWrite = schemaString.value
  const file = new Blob([dataToWrite], { type: "application/graphql" })
  const url = URL.createObjectURL(file)

  const filename = `${
    url.split("/").pop()!.split("#")[0].split("?")[0]
  }.graphql`

  URL.revokeObjectURL(url)

  const result = await platform.io.saveFileWithDialog({
    data: dataToWrite,
    contentType: "application/graphql",
    suggestedFilename: filename,
    filters: [
      {
        name: "GraphQL Schema File",
        extensions: ["graphql"],
      },
    ],
  })

  if (result.type === "unknown" || result.type === "saved") {
    downloadSchemaIcon.value = IconCheck
    toast.success(`${t("state.download_started")}`)
  }
}

const copySchema = () => {
  if (!schemaString.value) return

  copyToClipboard(schemaString.value)
  copySchemaIcon.value = IconCheck
}
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-sidebarPrimaryStickyFold #{!important};
}
</style>
