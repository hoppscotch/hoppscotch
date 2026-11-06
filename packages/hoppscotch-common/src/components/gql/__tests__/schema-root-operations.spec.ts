/* eslint-disable vue/one-component-per-file */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import {
  buildSchema,
  Kind,
  parse,
  validate,
  OperationTypeNode,
  type GraphQLNamedType,
} from "graphql"
import {
  createApp,
  defineComponent,
  h,
  ref,
  type App,
  type PropType,
} from "vue"
vi.mock("~/platform", () => ({ platform: {} }))
vi.mock("@composables/i18n", () => ({ useI18n: () => (key: string) => key }))
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))
import UnifiedDocumentation from "~/components/gql/SchemaDocumentation.vue"
import StandaloneDocumentation from "~/components/graphql/SchemaDocumentation.vue"
import UnifiedField from "~/components/gql/Field.vue"
import StandaloneField from "~/components/graphql/Field.vue"
import { useExplorer } from "~/helpers/graphql/explorer"
import { useQuery } from "~/helpers/graphql/query"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { GQLTabService } from "~/services/tab/graphql"
const Slot = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h("div", slots.default?.()),
})
const TypeLink = defineComponent({
  props: {
    type: { type: Object as PropType<GraphQLNamedType>, required: true },
  },
  setup: (props) => () => h("span", props.type.name),
})
const FieldLink = defineComponent({
  emits: ["add-field"],
  setup:
    (_, { emit }) =>
    () =>
      h("button", { onClick: () => emit("add-field") }, "+"),
})
for (const surface of ["unified", "standalone"] as const) {
  describe(`${surface} schema root field insertion`, () => {
    const explorer = useExplorer()
    const apps: App[] = []
    let container: TestContainer
    let builder: GQLQueryBuilderService
    let standalone: ReturnType<typeof useQuery>
    const mount = (component: Parameters<typeof createApp>[0], props = {}) => {
      const app = createApp(component, props)
      apps.push(app)
      app.use(diocPlugin, { container })
      app.directive("tippy", {})
      for (const prefix of ["Gql", "Graphql"]) {
        app.component(`${prefix}ExplorerSection`, Slot)
        app.component(`${prefix}TypeLink`, TypeLink)
        app.component(`${prefix}FieldLink`, FieldLink)
        app.component(`${prefix}DefaultValue`, Slot)
      }
      app.component("AppMarkdown", Slot)
      const root = document.createElement("div")
      app.mount(root)
      return root
    }
    beforeEach(() => {
      explorer.reset()
      const request = getDefaultGQLRequest()
      request.query = ""
      const currentActiveTab = ref({
        id: "root-test",
        document: { type: "gql-request", request, cursorPosition: 0 },
      })
      container = new TestContainer()
      container.bindMock(WorkspaceTabsService, {
        currentActiveTab: currentActiveTab as any,
      })
      container.bindMock(GQLTabService, {
        currentActiveTab: currentActiveTab as any,
      })
      builder = container.bind(GQLQueryBuilderService)
      mount(
        defineComponent({
          setup() {
            standalone = useQuery()
            standalone.updatedQuery.value = ""
            standalone.operationDefinitions.value = []
            return () => null
          },
        })
      )
    })
    afterEach(() => {
      apps.splice(0).forEach((app) => app.unmount())
      explorer.reset()
    })
    it.each([
      ["Query", OperationTypeNode.QUERY, 0, "read"],
      ["Mutation", OperationTypeNode.MUTATION, 1, "write"],
      ["Subscription", OperationTypeNode.SUBSCRIPTION, 2, "events"],
      ["RootQuery", OperationTypeNode.QUERY, 0, "read"],
      ["RootMutation", OperationTypeNode.MUTATION, 1, "write"],
      ["RootSubscription", OperationTypeNode.SUBSCRIPTION, 2, "events"],
    ] as const)(
      "inserts a valid %s root field",
      (rootName, operation, position, fieldName) => {
        const query = operation === "query" ? rootName : "Query"
        const mutation = operation === "mutation" ? rootName : "Mutation"
        const subscription =
          operation === "subscription" ? rootName : "Subscription"
        const schema =
          buildSchema(`schema { query: ${query} mutation: ${mutation} subscription: ${subscription} }
        type ${query} { read: String } type ${mutation} { write: String } type ${subscription} { events: String }`)
        const rootType = schema.getRootType(operation)!
        const root = mount(
          surface === "unified"
            ? UnifiedDocumentation
            : StandaloneDocumentation,
          { schema }
        )
        const selector =
          surface === "unified"
            ? ".cursor-pointer"
            : ".hopp-doc-explorer-root-wrapper"
        const card = root.querySelectorAll<HTMLElement>(selector)[position]
        expect(card.textContent).toContain(rootName)
        card.click()
        expect(explorer.currentNavItem.value.def).toEqual(rootType)
        const field = mount(
          surface === "unified" ? UnifiedField : StandaloneField,
          { field: rootType.getFields()[fieldName], showAddField: true }
        )
        field.querySelector<HTMLButtonElement>("button")!.click()
        const ast = parse(
          surface === "unified"
            ? builder.updatedQuery.value
            : standalone.updatedQuery.value
        )
        expect(validate(schema, ast)).toEqual([])
        expect(ast.definitions).toHaveLength(1)
        const definition = ast.definitions[0]
        expect(definition.kind).toBe(Kind.OPERATION_DEFINITION)
        if (definition.kind !== Kind.OPERATION_DEFINITION)
          throw new Error("Expected operation")
        expect(definition.operation).toBe(operation)
      }
    )
  })
}
