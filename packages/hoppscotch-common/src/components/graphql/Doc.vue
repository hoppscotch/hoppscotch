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
  isObjectType,
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

function insertGraphQLField(
  currentQuery: string,
  field: GraphQLField<any, any>
): string {
  if (!currentQuery.trim()) return createNewQuery(field)

  try {
    const ast = parse(currentQuery)
    const fieldName = field.name

    // Determine the operation type for the field
    const operationType = getOperationType(field)

    // Helper function to check if field exists in an operation
    const isFieldInOperation = (node: OperationDefinitionNode) => {
      if (!node.selectionSet) return false
      return node.selectionSet.selections.some(
        (selection) =>
          selection.kind === "Field" &&
          selection.name.value.split("(")[0] === fieldName
      )
    }

    // Modify the AST
    const modifiedAst = visit(ast, {
      OperationDefinition(node: OperationDefinitionNode) {
        // If operation type matches and field doesn't exist
        if (
          node.operation === operationType.toLowerCase() &&
          !isFieldInOperation(node)
        ) {
          // Check if the field has a complex type that needs nested selection
          const fieldType = getNamedType(field.type)

          const fieldNode =
            fieldType.name !== "String" &&
            fieldType.name !== "Int" &&
            fieldType.name !== "Float" &&
            fieldType.name !== "Boolean"
              ? {
                  kind: "Field",
                  name: { kind: "Name", value: fieldName },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "id" },
                      },
                    ],
                  },
                }
              : createFieldNode(field)

          return {
            ...node,
            selectionSet: {
              ...node.selectionSet,
              selections: [...(node.selectionSet?.selections || []), fieldNode],
            },
          }
        }
        return node
      },
    })

    const wasModified = modifiedAst !== ast

    if (!wasModified) {
      modifiedAst.definitions.push(createOperationNode(field))
    }

    return print(modifiedAst)
  } catch (error) {
    console.error("Error inserting field:", error)
    return createNewQuery(field)
  }
}

// Helper function to create a field node
function createFieldNode(field: GraphQLField<any, any>) {
  const fieldName = field.name
  const fieldType = getNamedType(field.type)

  // Check if the field has a complex type that needs nested selection
  if (
    fieldType.name !== "String" &&
    fieldType.name !== "Int" &&
    fieldType.name !== "Float" &&
    fieldType.name !== "Boolean"
  ) {
    return {
      kind: "Field",
      name: { kind: "Name", value: fieldName },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "id" },
          },
        ],
      },
    }
  }

  // Handle fields with arguments
  if (field.args.length > 0) {
    const argStrings = field.args.map(
      (arg) => `${arg.name}: ${getDefaultArgumentValue(arg.type)}`
    )
    return {
      kind: "Field",
      name: {
        kind: "Name",
        value: fieldName,
      },
      arguments: argStrings.map((arg) => ({
        kind: "Argument",
        name: { kind: "Name", value: arg.split(":")[0].trim() },
        value: {
          kind: "StringValue",
          value: arg.split(":")[1].trim(),
        },
      })),
    }
  }

  return {
    kind: "Field",
    name: { kind: "Name", value: fieldName },
  }
}

// Helper function to get operation type
function getOperationType(field: GraphQLField<any, any>): string {
  if (queryFields.value.includes(field)) return "Query"
  if (mutationFields.value.includes(field)) return "Mutation"
  if (subscriptionFields.value.includes(field)) return "Subscription"
  return "Query" // Default fallback
}

// Helper function to create a new operation node
function createOperationNode(field: GraphQLField<any, any>) {
  const operationType = getOperationType(field)
  const operationName = `${operationType.toLowerCase()}Operation`

  return {
    kind: "OperationDefinition",
    operation: operationType.toLowerCase(),
    name: { kind: "Name", value: operationName },
    selectionSet: {
      kind: "SelectionSet",
      selections: [createFieldNode(field)],
    },
  }
}

// Helper function to create a new query
function createNewQuery(field: GraphQLField<any, any>): string {
  const operationType = getOperationType(field)
  const operationName = `${operationType.toLowerCase()}Operation`
  const fieldType = getNamedType(field.type)

  const argParts = field.args.length
    ? `(${field.args.map((arg) => `$${arg.name}: ${arg.type}`).join(", ")})`
    : ""

  const variableParts = field.args.length
    ? `(${field.args.map((arg) => `${arg.name}: $${arg.name}`).join(", ")})`
    : ""

  const fieldSelection = isObjectType(fieldType)
    ? `{\n  ${Object.values(fieldType.getFields())
        .map((subField: any) => subField.name)
        .join("\n  ")}\n}`
    : ""

  return `${operationType.toLowerCase()} ${operationName}${argParts} {
  ${field.name}${variableParts} ${fieldSelection}
}`
}

// Helper to get default argument value based on type
function getDefaultArgumentValue(type: GraphQLType): string {
  const namedType = getNamedType(type)
  switch (namedType.name) {
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
