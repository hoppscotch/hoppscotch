import { useService } from "dioc/vue"
import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLArgument,
  GraphQLType,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  print,
} from "graphql"
import { ref } from "vue"
import { useToast } from "~/composables/toast"
import { GQLTabService } from "~/services/tab/graphql"
import { ExplorerFieldDef, ExplorerNavStackItem, useExplorer } from "./explorer"

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

const updatedQuery = ref("")
const cursorPosition = ref({ line: 0, ch: 1 })
const operations = ref<OperationDefinitionNode[]>([])

export function useQuery() {
  const tabs = useService(GQLTabService)
  const toast = useToast()
  const { navStack, push } = useExplorer()

  // Utility functions
  const getDefaultArgumentValue = (type: GraphQLType): string => {
    const namedType = getNamedType(type)
    const defaultValues: Record<string, string> = {
      String: '""',
      Int: "0",
      Float: "0.0",
      Boolean: "false",
    }
    return defaultValues[namedType.name] || "null"
  }

  const getOperationTypeNode = (name: string): OperationTypeNode => {
    const operationTypes: Record<string, OperationTypeNode> = {
      Query: OperationTypeNode.QUERY,
      Mutation: OperationTypeNode.MUTATION,
      Subscription: OperationTypeNode.SUBSCRIPTION,
    }
    return operationTypes[name] || OperationTypeNode.QUERY
  }

  const getOperation = (cursorPosition: number) => {
    return operations.value.find(
      ({ loc }) =>
        loc && cursorPosition >= loc.start && cursorPosition <= loc.end
    )
  }

  const createArgumentNode = (
    argName: string,
    type: GraphQLType
  ): ArgumentNode => ({
    kind: Kind.ARGUMENT,
    name: { kind: Kind.NAME, value: argName },
    value: { kind: Kind.STRING, value: getDefaultArgumentValue(type) },
  })

  const createFieldNode = (
    name: string,
    args: GraphQLArgument[] | undefined,
    hasNestedFields = false
  ): Mutable<FieldNode> => ({
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: name },
    arguments: args?.map((arg) => createArgumentNode(arg.name, arg.type)) || [],
    directives: [],
    selectionSet: hasNestedFields
      ? { kind: Kind.SELECTION_SET, selections: [] }
      : undefined,
  })

  // Add this type
  type OperationResult = {
    document: DocumentNode
    fieldLocation?: {
      start: number
      end: number
    }
  }

  // Core function to handle merging, checking existence, and building operations
  const processOperation = (
    navItems: ExplorerNavStackItem[],
    existingOperation?: OperationDefinitionNode
  ): OperationResult => {
    const queryPath = navItems.slice(2)
    const lastItem = queryPath[queryPath.length - 1]
    const requestedOperationType = getOperationTypeNode(navItems[1].name)

    // Create new operation if there's no existing operation or operation types don't match
    if (
      !existingOperation ||
      existingOperation.operation !== requestedOperationType
    ) {
      // Build from bottom up starting with the last field
      let currentSelection = createFieldNode(
        lastItem.name,
        lastItem.def?.args,
        lastItem.def?.fields?.length > 0
      )

      for (let i = queryPath.length - 2; i >= 0; i--) {
        const item = queryPath[i]
        const parentField = createFieldNode(item.name, item.def?.args, true)
        parentField.selectionSet!.selections = [currentSelection]
        currentSelection = parentField
      }

      return {
        document: {
          kind: Kind.DOCUMENT,
          definitions: [
            {
              kind: Kind.OPERATION_DEFINITION,
              operation: requestedOperationType,
              name: { kind: Kind.NAME, value: queryPath[0].name },
              variableDefinitions: [],
              directives: [],
              selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: [currentSelection],
              },
            },
          ],
        },
      }
    }

    // For existing operations
    let currentSelectionSet = existingOperation.selectionSet
    let fieldExists = false
    let fieldLocation: { start: number; end: number } | undefined

    // Navigate through the path
    for (let i = 0; i < queryPath.length; i++) {
      const item = queryPath[i]
      const isLastItem = i === queryPath.length - 1

      const existingFieldIndex = currentSelectionSet.selections.findIndex(
        (selection): selection is FieldNode =>
          selection.kind === Kind.FIELD && selection.name.value === item.name
      )

      if (existingFieldIndex !== -1) {
        const existingField = currentSelectionSet.selections[
          existingFieldIndex
        ] as Mutable<FieldNode>

        if (isLastItem) {
          // Store the location before removing
          if (existingField.loc) {
            fieldLocation = {
              start: existingField.loc.start,
              end: existingField.loc.end,
            }
          }
          // Remove the field if it already exists
          currentSelectionSet.selections.splice(existingFieldIndex, 1)
          fieldExists = true
          break
        }

        // Ensure parent has a selection set
        if (!existingField.selectionSet) {
          existingField.selectionSet = {
            kind: Kind.SELECTION_SET,
            selections: [],
          }
        }

        // Move to the next level
        currentSelectionSet = existingField.selectionSet ?? {
          kind: Kind.SELECTION_SET,
          selections: [],
        }
      } else {
        const newField = createFieldNode(
          item.name,
          (item.def as any)?.args, // these type assertion is avoidable
          !isLastItem || (isLastItem && (item.def as any)?.fields?.length > 0)
        )

        // Store the approximate location where field will be added
        if (currentSelectionSet.loc) {
          fieldLocation = {
            start: currentSelectionSet.loc.end - 1,
            end: currentSelectionSet.loc.end - 1,
          }
        }

        if (!isLastItem) {
          // Ensure non-leaf nodes have a selection set
          newField.selectionSet = {
            kind: Kind.SELECTION_SET,
            selections: [],
          }
        }

        currentSelectionSet.selections.push(newField)

        if (!isLastItem) {
          // Move to the next level
          currentSelectionSet = newField.selectionSet!
        }
      }
    }

    return {
      document: {
        kind: Kind.DOCUMENT,
        definitions: [existingOperation],
      },
      fieldLocation,
    }
  }

  // Main handler for adding fields
  const handleAddField = (field: ExplorerFieldDef) => {
    const currentTab = tabs.currentActiveTab.value
    if (!currentTab) return

    const currentQuery = currentTab.document.request.query || ""
    const selectedOperation = getOperation(currentTab.document.cursorPosition)
    const navItems = [...navStack.value, { name: field.name, def: field }]

    const result = processOperation(
      navItems as ExplorerNavStackItem[],
      selectedOperation
    )
    const newQuery = print(result.document.definitions[0])

    // If operation type is different or no existing operation,
    // append as a new operation
    if (
      !selectedOperation ||
      selectedOperation.operation !== getOperationTypeNode(navItems[1].name)
    ) {
      updatedQuery.value = currentQuery.trim()
        ? `${currentQuery}\n\n${newQuery}`
        : newQuery
      // Set cursor at the start of new operation
      cursorPosition.value = {
        line: currentQuery.split("\n").length + 2,
        ch: -1,
      }
      return
    }

    // Replace existing operation if operation types match
    updatedQuery.value = currentQuery.replace(
      currentQuery.substring(
        selectedOperation.loc!.start,
        selectedOperation.loc!.end
      ),
      newQuery
    )

    // Update cursor position to field location
    if (result.fieldLocation) {
      const precedingText = currentQuery.substring(
        0,
        result.fieldLocation.start
      )
      const lines = precedingText.split("\n")
      cursorPosition.value = {
        line: lines.length - 1,
        ch: -1,
      }
    }
  }

  return {
    handleAddField,
    handleAddArgument: handleAddField,
    updatedQuery,
    cursorPosition,
    operationDefinitions: operations,
  }
}
