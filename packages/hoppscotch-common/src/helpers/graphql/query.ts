import { useService } from "dioc/vue"
import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLType,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  print,
  SelectionNode,
  SelectionSetNode,
} from "graphql"
import { ref } from "vue"
import { GQLTabService } from "~/services/tab/graphql"
import {
  ExplorerFieldDef,
  ExplorerNavStack,
  ExplorerNavStackItem,
  useExplorer,
} from "./explorer"
import { useToast } from "~/composables/toast"

const updatedQuery = ref("")
const cursorPosition = ref({ line: 0, ch: 0 })
const operations = ref<OperationDefinitionNode[]>([])

export function useQuery() {
  const tabs = useService(GQLTabService)
  const toast = useToast()

  const { navStack } = useExplorer()

  const getOperation = (cursorPosition: number) => {
    return operations.value.find((operation) => {
      const { start, end } = operation.loc!
      return cursorPosition >= start && cursorPosition <= end
    })
  }

  const getSelectedOperation = () =>
    getOperation(tabs.currentActiveTab.value.document.cursorPosition)

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

  function getOperationTypeNode(name: string): OperationTypeNode {
    return name === "Query"
      ? OperationTypeNode.QUERY
      : name === "Mutation"
        ? OperationTypeNode.MUTATION
        : OperationTypeNode.SUBSCRIPTION
  }

  function buildOperationNode(navStack: ExplorerNavStackItem[]): DocumentNode {
    // Skip root and query/mutation/subscription
    const queryPath = navStack.slice(2)

    // Build the selections from inside out
    let currentSelection: FieldNode = {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: queryPath[queryPath.length - 1].name,
      },
      arguments: [],
      directives: [],
    }

    for (let i = queryPath.length - 2; i >= 0; i--) {
      const item = queryPath[i]
      const arguments_: ArgumentNode[] = []

      if (item.def?.args) {
        for (const arg of item.def.args) {
          arguments_.push({
            kind: Kind.ARGUMENT,
            name: {
              kind: Kind.NAME,
              value: arg.name,
            },
            value: {
              kind: Kind.STRING,
              value: getDefaultArgumentValue(arg.type),
            },
          })
        }
      }

      // Check if the field has nested fields and ensure it has a selectionSet
      let selectionSet: SelectionSetNode | undefined = undefined
      if (item.def?.fields && item.def.fields.length > 0) {
        selectionSet = {
          kind: Kind.SELECTION_SET,
          selections: [currentSelection],
        }
      }

      // Wrap the current selection in a new field
      currentSelection = {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: item.name,
        },
        arguments: arguments_,
        directives: [],
        selectionSet: selectionSet,
      }
    }

    // Create the final document
    const operation: OperationDefinitionNode = {
      kind: Kind.OPERATION_DEFINITION,
      operation: getOperationTypeNode(navStack[1].name),
      name: {
        kind: Kind.NAME,
        value: navStack[navStack.length - 1].name,
      },
      variableDefinitions: [],
      directives: [],
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [currentSelection],
      },
    }

    const document: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [operation],
    }

    return document
  }

  function hasField(
    selections: readonly SelectionNode[] | undefined,
    fieldName: string
  ): FieldNode | undefined {
    if (!selections) return undefined
    return selections.find(
      (selection) =>
        selection.kind === Kind.FIELD && selection.name.value === fieldName
    ) as FieldNode | undefined
  }

  function hasArgument(
    args: readonly ArgumentNode[] | undefined,
    argName: string
  ): boolean {
    if (!args) return false
    return args.some((arg) => arg.name.value === argName)
  }

  function mergeAndBuildOperationNode(
    navStack: ExplorerNavStackItem[],
    operation: OperationDefinitionNode
  ): OperationDefinitionNode {
    const queryPath = navStack.slice(2)
    let currentSelectionSet = operation.selectionSet

    // Build the path from top to bottom
    for (let i = 0; i < queryPath.length; i++) {
      const item = queryPath[i]
      let existingField = hasField(currentSelectionSet.selections, item.name)

      if (existingField) {
        // If field exists but doesn't have a selection set, create one
        if (!existingField.selectionSet) {
          existingField = {
            ...existingField,
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [],
            },
          }
        }
        // Add any missing arguments
        if (item.def?.args) {
          const newArgs: ArgumentNode[] = []
          for (const arg of item.def.args) {
            if (!hasArgument(existingField.arguments, arg.name)) {
              newArgs.push({
                kind: Kind.ARGUMENT,
                name: {
                  kind: Kind.NAME,
                  value: arg.name,
                },
                value: {
                  kind: Kind.STRING,
                  value: getDefaultArgumentValue(arg.type),
                },
              })
            }
          }
          existingField = {
            ...existingField,
            arguments: [...(existingField.arguments || []), ...newArgs],
          }
        }
        currentSelectionSet = existingField.selectionSet!
      } else {
        // Create new field with arguments
        const arguments_: ArgumentNode[] = []

        if (item.def?.args) {
          for (const arg of item.def.args) {
            arguments_.push({
              kind: Kind.ARGUMENT,
              name: {
                kind: Kind.NAME,
                value: arg.name,
              },
              value: {
                kind: Kind.STRING,
                value: getDefaultArgumentValue(arg.type),
              },
            })
          }
        }

        const newField: FieldNode = {
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: item.name,
          },
          arguments: arguments_,
          directives: [],
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [],
          },
        }

        currentSelectionSet.selections = [
          ...currentSelectionSet.selections,
          newField,
        ]
        currentSelectionSet = newField.selectionSet!
      }
    }

    return operation
  }

  const handleAddField = (field: ExplorerFieldDef) => {
    const currentTab = tabs.currentActiveTab.value
    if (!currentTab) return

    const currentQuery = currentTab.document.request.query || ""
    const selectedOperation = getSelectedOperation()

    console.info("Current Query", currentQuery, selectedOperation)

    const navItems: ExplorerNavStackItem[] = []
    navItems.push(...(navStack.value as ExplorerNavStack), field)

    if (!currentQuery.trim() || !selectedOperation) {
      console.info("No query found, creating a new one")
      const q = buildOperationNode(navItems)
      const query = print(q)
      updatedQuery.value = `${currentQuery}\n\n${query}`
      return
    }

    // Check for duplicates only if there's an existing operation
    if (selectedOperation) {
      showToastIfOperationExists(selectedOperation, field)
    }

    const queryAst = mergeAndBuildOperationNode(navItems, selectedOperation)
    const query = print(queryAst)

    // should remove selected operation start to end from currentQuery and add query in place
    updatedQuery.value = currentQuery.replace(
      currentQuery.substring(
        selectedOperation.loc!.start,
        selectedOperation.loc!.end
      ),
      query
    )
  }

  function showToastIfOperationExists(
    operation: OperationDefinitionNode,
    field: ExplorerFieldDef
  ) {
    const navItems = [...navStack.value]
    let currentSelectionSet = operation.selectionSet

    // Navigate through the existing selection set following navStack
    for (let i = 2; i < navItems.length; i++) {
      const existingField = hasField(
        currentSelectionSet.selections,
        navItems[i].name
      )
      if (!existingField) break
      if (existingField.selectionSet) {
        currentSelectionSet = existingField.selectionSet
      }
    }

    // Check if the field we're trying to add already exists
    if (hasField(currentSelectionSet.selections, field.name)) {
      toast.error(`Field "${field.name}" already exists in the query`)
      return
    }
  }

  const handleAddArgument = (arg: any) => {
    // it's also one kind of field so use handleAddField
    handleAddField(arg)
  }

  return {
    handleAddField,
    handleAddArgument,
    updatedQuery,
    cursorPosition,
    operationDefinitions: operations,
  }
}
