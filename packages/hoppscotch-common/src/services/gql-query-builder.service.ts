import { Service } from "dioc"
import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLArgument,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLType,
  isInterfaceType,
  isLeafType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  print,
  SelectionNode,
  ValueNode,
} from "graphql"
import { ref } from "vue"
import { WorkspaceTabsService } from "./tab/workspace-tabs"
import {
  ExplorerFieldDef,
  ExplorerNavStackItem,
  useExplorer,
} from "~/helpers/graphql/explorer"

type Mutable<T> = {
  -readonly [K in keyof T]: T[K]
}

type OperationResult = {
  append?: boolean
  document: DocumentNode | null
  fieldLocation?: {
    start: number
    end: number
  }
}

/**
 * Schema-explorer → query-editor insertion logic for the unified workspace's
 * GraphQL flow.
 *
 * Mirrors the legacy `useQuery()` composable in `helpers/graphql/query.ts`
 * (which still backs the standalone `/graphql` page unchanged), but:
 *   - reads/writes the active tab via `WorkspaceTabsService` instead of
 *     `GQLTabService`, so the "+" button on a field writes into the unified
 *     workspace's `gql-request` tab;
 *   - emits **required** arguments only (no `(filter: "null")` placeholders
 *     for optional args);
 *   - auto-expands the field's return-type leaves so clicking `+` on
 *     `countries` produces `countries { code name capital ... }` instead of
 *     a bare `countries` with no selection set;
 *   - emits `ValueNode`s of the correct kind for default values
 *     (`Int → IntValue`, `Boolean → BooleanValue`, unknown → `NullValue`)
 *     rather than stringifying everything as `StringValue`.
 */
export class GQLQueryBuilderService extends Service {
  public static readonly ID = "GQL_QUERY_BUILDER_SERVICE"

  private readonly workspaceTabs = this.bind(WorkspaceTabsService)

  public readonly updatedQuery = ref("")
  public readonly cursorPosition = ref({ line: 0, ch: 1 })
  public readonly operations = ref<OperationDefinitionNode[]>([])

  private getActiveGQLDoc() {
    const tab = this.workspaceTabs.currentActiveTab.value
    return tab?.document.type === "gql-request" ? tab.document : undefined
  }

  private createDefaultValueNode(type: GraphQLType): ValueNode {
    const namedType = getNamedType(type)
    switch (namedType.name) {
      case "String":
      case "ID":
        return { kind: Kind.STRING, value: "" }
      case "Int":
        return { kind: Kind.INT, value: "0" }
      case "Float":
        return { kind: Kind.FLOAT, value: "0.0" }
      case "Boolean":
        return { kind: Kind.BOOLEAN, value: false }
      default:
        return { kind: Kind.NULL }
    }
  }

  private getOperationTypeNode(name: string): OperationTypeNode {
    const operationTypes: Record<string, OperationTypeNode> = {
      Query: OperationTypeNode.QUERY,
      Mutation: OperationTypeNode.MUTATION,
      Subscription: OperationTypeNode.SUBSCRIPTION,
    }
    return operationTypes[name] || OperationTypeNode.QUERY
  }

  private getOperation(cursor: number) {
    return this.operations.value.find(
      ({ loc }) => loc && cursor >= loc.start && cursor <= loc.end
    )
  }

  private createArgumentNode(argName: string, type: GraphQLType): ArgumentNode {
    return {
      kind: Kind.ARGUMENT,
      name: { kind: Kind.NAME, value: argName },
      value: this.createDefaultValueNode(type),
    }
  }

  /**
   * Expand the scalar/enum (leaf) children of an object/interface return type
   * into a default selection set. Nested object children are intentionally
   * skipped — users drill in via the explorer to add them.
   */
  private buildDefaultSelections(type: GraphQLType): SelectionNode[] {
    const namedType = getNamedType(type)
    if (!isObjectType(namedType) && !isInterfaceType(namedType)) return []
    const fields = (
      namedType as GraphQLObjectType | GraphQLInterfaceType
    ).getFields()
    return Object.values(fields)
      .filter((f) => isLeafType(getNamedType(f.type)))
      .map((f) => this.createFieldNode(f.name, undefined))
  }

  private createFieldNode(
    name: string,
    args: readonly GraphQLArgument[] | undefined,
    returnType?: GraphQLType,
    forceEmptySelectionSet = false
  ): Mutable<FieldNode> {
    const requiredArgs = args?.filter((arg) => isNonNullType(arg.type)) ?? []
    const selections = returnType ? this.buildDefaultSelections(returnType) : []

    return {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: name },
      arguments: requiredArgs.map((arg) =>
        this.createArgumentNode(arg.name, arg.type)
      ),
      directives: [],
      selectionSet:
        selections.length > 0 || forceEmptySelectionSet
          ? { kind: Kind.SELECTION_SET, selections }
          : undefined,
    }
  }

  private processOperation(
    navItems: ExplorerNavStackItem[],
    existingOperation?: OperationDefinitionNode,
    isArgument = false
  ): OperationResult {
    const queryPath = navItems.slice(2, isArgument ? -1 : undefined)
    const argumentItem = isArgument ? navItems[navItems.length - 1] : null
    const lastItem = queryPath[queryPath.length - 1]
    const requestedOperationType = this.getOperationTypeNode(navItems[1].name)

    if (
      !existingOperation ||
      existingOperation.operation !== requestedOperationType
    ) {
      const lastFieldDef = lastItem.def as
        | GraphQLField<unknown, unknown>
        | undefined
      let currentSelection = this.createFieldNode(
        lastItem.name,
        isArgument && argumentItem
          ? [argumentItem.def as GraphQLArgument]
          : lastFieldDef?.args,
        lastFieldDef?.type
      )

      for (let i = queryPath.length - 2; i >= 0; i--) {
        const item = queryPath[i]
        const parentField = this.createFieldNode(
          item.name,
          (item.def as GraphQLField<unknown, unknown> | undefined)?.args,
          undefined,
          true
        )
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

    let currentSelectionSet = existingOperation.selectionSet
    let fieldLocation: { start: number; end: number } | undefined
    let append = false

    if (
      requestedOperationType === OperationTypeNode.SUBSCRIPTION &&
      requestedOperationType === existingOperation?.operation
    ) {
      const existingTopField = existingOperation.selectionSet
        .selections[0] as FieldNode

      if (
        existingTopField.name.value !==
        (queryPath && queryPath[0] && queryPath[0]?.name)
      ) {
        append = true
        currentSelectionSet.selections = []
      }
    }

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
        ] as Mutable<FieldNode> & { arguments?: ArgumentNode[] }

        if (isLastItem) {
          if (isArgument && argumentItem) {
            const argIndex =
              existingField.arguments?.findIndex(
                (arg) => arg.name.value === argumentItem.name
              ) ?? -1

            if (argIndex !== -1) {
              existingField.arguments?.splice(argIndex, 1)
            } else {
              const newArg = this.createArgumentNode(
                argumentItem.name,
                (argumentItem.def as any)?.type
              )
              existingField.arguments = existingField.arguments || []
              existingField.arguments.push(newArg)
            }
          } else {
            ;(
              currentSelectionSet.selections as Mutable<SelectionNode>[]
            ).splice(existingFieldIndex, 1)
          }

          if (existingField.loc) {
            fieldLocation = {
              start: existingField.loc.start,
              end: existingField.loc.end,
            }
          }
          break
        }

        if (!existingField.selectionSet) {
          existingField.selectionSet = {
            kind: Kind.SELECTION_SET,
            selections: [],
          }
        }

        currentSelectionSet = existingField.selectionSet ?? {
          kind: Kind.SELECTION_SET,
          selections: [],
        }
      } else {
        const itemFieldDef = item.def as
          | GraphQLField<unknown, unknown>
          | undefined
        const newField = this.createFieldNode(
          item.name,
          isLastItem && isArgument && argumentItem
            ? [argumentItem.def as GraphQLArgument]
            : itemFieldDef?.args,
          isLastItem ? itemFieldDef?.type : undefined,
          !isLastItem
        )

        if (currentSelectionSet.loc) {
          fieldLocation = {
            start: currentSelectionSet.loc.end - 1,
            end: currentSelectionSet.loc.end - 1,
          }
        }

        if (!isLastItem) {
          newField.selectionSet = {
            kind: Kind.SELECTION_SET,
            selections: [],
          }
        }

        ;(currentSelectionSet.selections as Mutable<FieldNode[]>).push(newField)

        if (!isLastItem) {
          currentSelectionSet = newField.selectionSet!
        }
      }
    }

    return {
      document:
        existingOperation.selectionSet.selections.length === 0
          ? null
          : {
              kind: Kind.DOCUMENT,
              definitions: [existingOperation],
            },
      fieldLocation,
      append,
    }
  }

  private handleOperation(item: ExplorerFieldDef, isArgument = false) {
    const activeDoc = this.getActiveGQLDoc()
    if (!activeDoc) return

    const { navStack } = useExplorer()
    const currentQuery = activeDoc.request.query || ""
    const selectedOperation = this.getOperation(activeDoc.cursorPosition || 0)
    const navItems = [...navStack.value, { name: item.name, def: item }]

    const result = this.processOperation(
      navItems as ExplorerNavStackItem[],
      selectedOperation,
      isArgument
    )

    const newQuery = result.document
      ? print(result.document.definitions[0])
      : "\n"

    if (
      !selectedOperation ||
      selectedOperation.operation !==
        this.getOperationTypeNode(navItems[1].name) ||
      result.append
    ) {
      this.updatedQuery.value = currentQuery.trim()
        ? `${currentQuery}\n\n${newQuery}`
        : newQuery
      this.cursorPosition.value = {
        line: currentQuery.split("\n").length + (currentQuery.trim() ? 2 : 1),
        ch: -1,
      }
      return
    }

    this.updatedQuery.value = currentQuery.replace(
      currentQuery.substring(
        selectedOperation.loc!.start,
        selectedOperation.loc!.end
      ),
      newQuery
    )

    if (result.fieldLocation) {
      const precedingText = currentQuery.substring(
        0,
        result.fieldLocation.start
      )
      const lines = precedingText.split("\n")
      this.cursorPosition.value = {
        line: lines.length - 1,
        ch: -1,
      }
    }
  }

  public handleAddField(field: ExplorerFieldDef) {
    this.handleOperation(field)
  }

  public handleAddArgument(arg: ExplorerFieldDef) {
    this.handleOperation(arg, true)
  }

  public isFieldInOperation(item: ExplorerFieldDef): boolean {
    const { navStack } = useExplorer()
    const operation = this.getOperation(
      this.getActiveGQLDoc()?.cursorPosition || 0
    )
    if (!operation) return false

    const navPath = navStack.value.slice(2)
    let currentSelections = operation.selectionSet.selections

    for (let i = 0; i < navPath.length; i++) {
      const pathItem = navPath[i]
      const foundField = currentSelections.find(
        (selection) =>
          selection.kind === Kind.FIELD &&
          selection.name.value === pathItem.name
      ) as FieldNode | undefined

      if (!foundField?.selectionSet) return false

      currentSelections = foundField.selectionSet.selections
    }

    return currentSelections.some((selection) => {
      if (selection.kind !== Kind.FIELD) return false
      return selection.name.value === item.name
    })
  }

  public isArgumentInOperation(item: ExplorerFieldDef): boolean {
    const activeDoc = this.getActiveGQLDoc()
    if (!activeDoc) return false
    const cursor = activeDoc.cursorPosition ?? 0
    const operation = this.getOperation(cursor)
    if (!operation) return false

    let args: ArgumentNode[] = []

    operation.selectionSet.selections.forEach((selection) => {
      if (selection.kind === Kind.FIELD) {
        const fieldNode = selection as FieldNode
        if (
          fieldNode.loc &&
          fieldNode.loc.start <= cursor &&
          fieldNode.loc.end >= cursor
        ) {
          args = [...(fieldNode.arguments || [])]
        }
      }
    })

    if (args.length === 0) return false

    return args.some((arg) => arg.name.value === item.name)
  }
}
