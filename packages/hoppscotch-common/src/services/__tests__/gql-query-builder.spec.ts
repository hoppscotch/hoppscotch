import { afterEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import {
  buildSchema,
  Kind,
  parse,
  print,
  type OperationDefinitionNode,
  validate,
} from "graphql"
import { createApp, defineComponent, h, ref } from "vue"

vi.mock("~/platform", () => ({ platform: {} }))
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

import { useQuery } from "~/helpers/graphql/query"
import { useExplorer } from "~/helpers/graphql/explorer"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"
import { GQLTabService } from "~/services/tab/graphql"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"

const schema = buildSchema(`
  type Query { first: String second: String }
  type Mutation { first: String second: String }
  type Subscription { first: String second: String }
`)
const explorer = useExplorer()
afterEach(() => explorer.reset())

for (const surface of ["unified", "standalone"] as const) {
  describe(`${surface} explorer operations`, () => {
    const setup = (query: string, rootName = "Subscription") => {
      explorer.reset()
      const root = schema.getType(rootName) as NonNullable<
        ReturnType<typeof schema.getSubscriptionType>
      >
      explorer.push({ name: rootName, def: root })
      const activeTab = ref({
        document: {
          type: "gql-request",
          request: { query },
          cursorPosition: 0,
        },
      })
      const container = new TestContainer()
      let builder: Pick<
        ReturnType<typeof useQuery>,
        "handleAddField" | "updatedQuery" | "cursorPosition"
      > & { operations: { value: OperationDefinitionNode[] } }
      if (surface === "unified") {
        container.bindMock(WorkspaceTabsService, {
          currentActiveTab: activeTab as any,
        })
        builder = container.bind(GQLQueryBuilderService)
      } else {
        container.bindMock(GQLTabService, {
          currentActiveTab: activeTab as any,
        })
        const app = createApp(
          defineComponent({
            setup() {
              const result = useQuery()
              builder = { ...result, operations: result.operationDefinitions }
              return () => h("div")
            },
          })
        )
        app.use(diocPlugin, { container })
        app.mount(document.createElement("div"))
        app.unmount()
      }
      builder!.operations.value = parse(query).definitions.filter(
        (def): def is OperationDefinitionNode =>
          def.kind === Kind.OPERATION_DEFINITION
      )
      builder!.updatedQuery.value = ""
      return { builder: builder!, root, activeTab }
    }

    it.each([
      "",
      "\nquery second { first }\nmutation second_1 { first }\nsubscription second_2 { first }",
    ])("appends an independent subscription with unused name: %s", (extra) => {
      const original = "subscription First { first }"
      const { builder, root, activeTab } = setup(original + extra)
      const selected = builder.operations.value[0]
      const before = print(selected)
      builder.handleAddField(root.getFields().second)
      const ast = parse(builder.updatedQuery.value)
      const operations = ast.definitions as OperationDefinitionNode[]
      expect(validate(schema, ast).map((error) => error.message)).toEqual([])
      expect(print(selected)).toBe(before)
      expect(builder.updatedQuery.value.startsWith(original + extra)).toBe(true)
      const added = operations[operations.length - 1]
      expect(added.operation).toBe("subscription")
      expect(added.selectionSet.selections).toHaveLength(1)
      expect(print(added.selectionSet)).toContain("second")
      expect(new Set(operations.map((op) => op.name?.value)).size).toBe(
        operations.length
      )
      expect(activeTab.value.document.cursorPosition).toBe(0)
      expect(builder.cursorPosition.value).toEqual({
        line: (original + extra).split("\n").length + 2,
        ch: -1,
      })
    })

    it("keeps same-field toggle behavior", () => {
      const { builder, root } = setup("subscription First { first }")
      builder.handleAddField(root.getFields().first)
      expect(builder.updatedQuery.value.trim()).toBe("")
    })

    it.each(["Query", "Mutation"])(
      "merges another field into the selected %s",
      (rootName) => {
        const { builder, root } = setup(
          `${rootName.toLowerCase()} First { first }`,
          rootName
        )
        builder.handleAddField(root.getFields().second)
        const ast = parse(builder.updatedQuery.value)
        expect(validate(schema, ast)).toEqual([])
        expect(ast.definitions).toHaveLength(1)
        expect(
          (ast.definitions[0] as OperationDefinitionNode).selectionSet
            .selections
        ).toHaveLength(2)
      }
    )
  })
}
