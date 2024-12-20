<template>
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
  />
  <div v-else>
    <div
      class="sticky top-0 z-10 flex flex-shrink-0 overflow-x-auto bg-primary"
    >
      <input
        v-model="graphqlFieldsFilterText"
        type="search"
        autocomplete="off"
        class="flex w-full bg-transparent px-4 py-2 h-8"
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
          class="p-4"
          @jump-to-type="handleJumpToType"
          @add-field="handleAddField"
          @add-arg="handleAddArgument"
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
          class="p-4"
          @jump-to-type="handleJumpToType"
          @add-field="handleAddField"
          @add-arg="handleAddArgument"
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
          class="p-4"
          @jump-to-type="handleJumpToType"
          @add-field="handleAddField"
          @add-arg="handleAddArgument"
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
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useService } from "dioc/vue"
import {
  GraphQLField,
  GraphQLType,
  OperationDefinitionNode,
  getNamedType,
  parse,
  print,
  visit,
} from "graphql"
import { computed, nextTick, ref } from "vue"
import {
  graphqlTypes,
  mutationFields,
  queryFields,
  subscriptionFields,
} from "~/helpers/graphql/connection"
import { GQLTabService } from "~/services/tab/graphql"
import IconHelpCircle from "~icons/lucide/help-circle"

type GqlTabs = "queries" | "mutations" | "subscriptions" | "types"

const selectedGqlTab = ref<GqlTabs>("queries")

const t = useI18n()
const colorMode = useColorMode()

const tabs = useService(GQLTabService)

// Utility function for query insertion
function insertGraphQLField(
  currentQuery: string,
  field: GraphQLField<any, any>
): string {
  // const cursorPosition = tabs.currentActiveTab.value.document.cursorPosition
  try {
    // Parse the current query
    const ast = parse(currentQuery)

    // Helper to create field selection
    const createFieldSelection = () => {
      const fieldName = field.name

      // Handle fields with arguments
      if (field.args.length > 0) {
        const argStrings = field.args.map(
          (arg) => `${arg.name}: ${getDefaultArgumentValue(arg.type)}`
        )
        return `${fieldName}(${argStrings.join(", ")})`
      }

      return fieldName
    }

    // Modify the AST to insert the field
    const modifiedAst = visit(ast, {
      OperationDefinition(node: OperationDefinitionNode) {
        // If no selection set, create one
        if (!node.selectionSet) {
          return {
            ...node,
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: createFieldSelection() },
                },
              ],
            },
          }
        }

        // Find the right place to insert based on cursor
        const newSelections = [...node.selectionSet.selections]

        // Simple append for now - you might want more sophisticated insertion
        newSelections.push({
          kind: "Field",
          name: { kind: "Name", value: createFieldSelection() },
        })

        return {
          ...node,
          selectionSet: {
            ...node.selectionSet,
            selections: newSelections,
          },
        }
      },
    })

    // Convert back to string
    return print(modifiedAst)
  } catch (error) {
    console.error("Error inserting field:", error)
  }
}

// Helper to get default argument value based on type
function getDefaultArgumentValue(type: GraphQLType): string {
  switch (type.name) {
    case "String":
      return '""'
    case "Int":
      return "0"
    case "Float":
      return "0.0"
    case "Boolean":
      return "false"
    default:
      return "null"
  }
}

const handleAddField = (field: any) => {
  const currentTab = tabs.currentActiveTab.value
  if (!currentTab) return

  currentTab.document.request.query = insertGraphQLField(
    currentTab.document.request.query,
    field
  )
}

const handleAddArgument = (arg: any) => {
  const currentTab = tabs.currentActiveTab.value
  if (!currentTab) return

  currentTab.document.request.query = insertGraphQLField(
    currentTab.document.request.query,
    arg
  )
}

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

  const rootTypeName = getNamedType(type).name
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
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-sidebarPrimaryStickyFold #{!important};
}
</style>
