import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { createApp, defineComponent, h, nextTick, type App } from "vue"

vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: {} },
    auth: {
      getCurrentUser: () => null,
      getCurrentUserStream: () => new BehaviorSubject(null),
      getProbableUser: () => null,
    },
    backend: { getUserTeams: () => new Promise(() => {}) },
  },
}))

// Team environment fetches resolve by hand; their subscriptions are recorded.
const gql = vi.hoisted(() => ({
  fetches: [] as Array<{ teamID: string; resolve: (names: string[]) => void }>,
  subs: [] as Array<{ teamID: string; closed: boolean }>,
}))
vi.mock("~/helpers/backend/GQLClient", async (orig) => {
  const { Subject } = await import("rxjs")
  const docs = await import("~/helpers/backend/graphql")
  const envSubs: unknown[] = [
    docs.TeamEnvironmentCreatedDocument,
    docs.TeamEnvironmentUpdatedDocument,
    docs.TeamEnvironmentDeletedDocument,
  ]
  type Args = { query: unknown; variables: { teamID: string } }
  return {
    ...(await orig<object>()),
    runGQLQuery: ({ query, variables }: Args) =>
      query === docs.GetTeamEnvironmentsDocument
        ? new Promise((resolve) =>
            gql.fetches.push({
              teamID: variables.teamID,
              resolve: (names) =>
                resolve(
                  E.right({
                    team: {
                      teamEnvironments: names.map((name) => ({
                        id: name,
                        teamID: variables.teamID,
                        name,
                        variables: "[]",
                      })),
                    },
                  })
                ),
            })
          )
        : new Promise(() => {}),
    runGQLSubscription: ({ query, variables }: Args) => {
      const sub = { teamID: variables.teamID, closed: false }
      if (envSubs.includes(query)) gql.subs.push(sub)
      return [new Subject(), { unsubscribe: () => (sub.closed = true) }]
    },
  }
})

import { useChatContext } from "~/composables/chat-context"
import { WorkspaceService } from "~/services/workspace.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { TeamAccessRole } from "~/helpers/backend/graphql"
import { defineActionHandler } from "~/helpers/actions"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
const LONG_URL = `https://a.example/?filter=${"x".repeat(50_000)}`

describe("useChatContext", () => {
  let container: TestContainer
  let workspace: WorkspaceService
  let app: App | null
  let context: ReturnType<typeof useChatContext>

  const mount = () => {
    app = createApp(
      defineComponent({
        setup() {
          // Stands in for pages/index.vue, the only page binding it.
          defineActionHandler("rest.request.open", () => {})
          context = useChatContext()
          return () => h("div")
        },
      })
    )
    app.use(diocPlugin, { container })
    app.mount(document.createElement("div"))
  }

  const unmount = () => {
    app?.unmount()
    app = null
  }

  const toTeam = async (teamID: string) => {
    workspace.changeWorkspace({
      type: "team",
      teamID,
      teamName: teamID,
      role: TeamAccessRole.Owner,
    })
    await nextTick()
  }

  const fetchFor = (teamID: string) =>
    gql.fetches.find((f) => f.teamID === teamID)!

  beforeEach(() => {
    gql.fetches = []
    gql.subs = []
    container = new TestContainer()
    workspace = container.bind(WorkspaceService)
    app = null
  })

  afterEach(() => {
    unmount()
    workspace.changeWorkspace({ type: "personal" })
  })

  it("caps a long query-param value", async () => {
    mount()
    const tabs = container.bind(WorkspaceTabsService)
    const tab = tabs.createNewTab({
      type: "request",
      request: {
        ...getDefaultRESTRequest(),
        params: [
          {
            key: "filter",
            value: "x".repeat(50_000),
            active: true,
            description: "",
          },
        ],
      },
      isDirty: false,
    } as never)
    tabs.setActiveTab(tab.id)

    const sent = context.contextFor(null)

    expect(sent).toContain(`- filter: ${"x".repeat(120)}…[truncated]`)
    expect(sent.length).toBeLessThan(5000)
  })

  // A query string typed in the URL bar stays in the endpoint.
  it.each([
    [
      "REST",
      {
        type: "request",
        request: { ...getDefaultRESTRequest(), endpoint: LONG_URL },
      },
    ],
    [
      "GraphQL",
      {
        type: "gql-request",
        request: { ...getDefaultGQLRequest(), url: LONG_URL },
        response: null,
      },
    ],
  ])("caps a long %s URL", (_, doc) => {
    mount()
    const tabs = container.bind(WorkspaceTabsService)
    const tab = tabs.createNewTab({ ...doc, isDirty: false } as never)
    tabs.setActiveTab(tab.id)

    const sent = context.contextFor(null)

    expect(sent).toContain("…[truncated]")
    expect(sent.length).toBeLessThan(5000)
  })

  it("keeps a normal URL whole", () => {
    mount()
    const tabs = container.bind(WorkspaceTabsService)
    const endpoint = `https://a.example/?filter=${"x".repeat(500)}`
    const tab = tabs.createNewTab({
      type: "request",
      request: { ...getDefaultRESTRequest(), endpoint },
      isDirty: false,
    } as never)
    tabs.setActiveTab(tab.id)

    expect(context.contextFor(null)).toContain(`GET ${endpoint}\n`)
  })

  it("ignores a team's environments that land after a switch", async () => {
    mount()
    await toTeam("team_a")
    await toTeam("team_b")

    fetchFor("team_b").resolve(["b-env"])
    await tick()
    fetchFor("team_a").resolve(["a-env"])
    await tick()

    const sent = context.contextFor(null)
    expect(sent).toContain("All environments: b-env")
    expect(sent).not.toContain("a-env")
    // One set of live updates, for the team in view.
    expect(gql.subs.map((s) => s.teamID)).toEqual([
      "team_b",
      "team_b",
      "team_b",
    ])

    unmount()
    expect(gql.subs.every((s) => s.closed)).toBe(true)
  })

  it("subscribes nothing when a fetch lands after unmount", async () => {
    mount()
    await toTeam("team_c")
    unmount()

    fetchFor("team_c").resolve(["c-env"])
    await tick()

    expect(gql.subs).toEqual([])
  })
})
