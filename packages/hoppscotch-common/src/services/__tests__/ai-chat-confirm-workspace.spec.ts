import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { makeCollection } from "@hoppscotch/data"

// The sidebar helpers the chat reuses reach services through `getService`.
const holder = vi.hoisted(() => ({
  container: null as null | { bind: (service: never) => unknown },
}))
vi.mock("~/modules/dioc", async () => {
  const { Container } = await import("dioc")
  const fallback = new Container()
  return {
    getService: (service: never) =>
      (holder.container ?? fallback).bind(service),
  }
})

vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

const backend = vi.hoisted(() => ({
  getUserPublishedDocs: vi.fn(),
  createPublishedDoc: vi.fn(),
  deletePublishedDoc: vi.fn(),
  getMyMockServers: vi.fn(),
  createMockServer: vi.fn(),
  updateMockServer: vi.fn(),
  deleteMockServer: vi.fn(),
}))
vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: { chat: vi.fn() } },
    auth: {
      getCurrentUser: () => null,
      getCurrentUserStream: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
    },
    backend,
  },
}))

const deleteTeamCollection = vi.hoisted(() => vi.fn())
vi.mock("~/helpers/backend/mutations/TeamCollection", async (orig) => ({
  ...(await orig<object>()),
  deleteCollection: (...a: unknown[]) => deleteTeamCollection(...a),
}))

import { AIChatService } from "../ai-chat.service"
import { WorkspaceService } from "~/services/workspace.service"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { TestRunnerService } from "~/services/test-runner/test-runner.service"
import { TeamAccessRole } from "~/helpers/backend/graphql"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { restCollectionStore, setRESTCollections } from "~/newstore/collections"

type Internals = {
  pinWorkspace(): void
  chatRisks: { hosts: Set<string> }
  runCollection(name: string): Promise<string>
  deleteCollection(name: string): Promise<string>
  publishDocumentation(name: string): Promise<string>
  unpublishDocumentation(name: string): Promise<string>
  createMockServer(name: string): Promise<string>
  updateMockServer(
    name: string,
    changes: { isPublic?: boolean }
  ): Promise<string>
  deleteMockServer(name: string): Promise<string>
}
const inner = (c: AIChatService) => c as unknown as Internals

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
const right =
  <T>(value: T) =>
  () =>
    Promise.resolve(E.right(value))

const personalCollection = () =>
  makeCollection({
    name: "API",
    folders: [],
    requests: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
    id: "srv_API",
    _ref_id: "coll_API",
  })

describe("AIChatService prompts across a workspace switch", () => {
  let chat: AIChatService
  let workspace: WorkspaceService
  let teamCollections: TeamCollectionsService
  let runner: TestRunnerService

  const team = (teamID: string) => ({
    type: "team" as const,
    teamID,
    teamName: teamID,
    role: TeamAccessRole.Owner,
  })

  /** Starts `start`, switches workspace while its prompt is open, approves. */
  const approveAfterSwitch = async (
    start: () => Promise<string>,
    to: ReturnType<typeof team>
  ) => {
    inner(chat).pinWorkspace()
    const done = start()
    for (let i = 0; i < 50 && !chat.pendingConfirmation.value; i++) await tick()
    expect(chat.pendingConfirmation.value).not.toBeNull()
    workspace.changeWorkspace(to)
    chat.resolveConfirmation(true)
    return done
  }

  beforeEach(() => {
    const c = new TestContainer()
    holder.container = c as never
    chat = c.bind(AIChatService)
    workspace = c.bind(WorkspaceService)
    teamCollections = c.bind(TeamCollectionsService)
    runner = c.bind(TestRunnerService)
    // No backend here: skip the tree load a switch triggers.
    vi.spyOn(teamCollections, "changeTeamID").mockImplementation(() => {})
    for (const fn of [...Object.values(backend), deleteTeamCollection])
      fn.mockReset()
    backend.getUserPublishedDocs.mockReturnValue(right([]))
    backend.getMyMockServers.mockReturnValue(
      right([{ id: "m1", name: "M", isPublic: false, isActive: true }])
    )
    setRESTCollections([personalCollection()])
  })

  afterEach(() => {
    holder.container = null
    vi.restoreAllMocks()
  })

  it("deletes no team collection once the user left that team", async () => {
    workspace.changeWorkspace(team("team_1"))
    teamCollections.collections.value = [
      { id: "r1", title: "API", children: [], requests: [], data: null },
    ]

    const reply = await approveAfterSwitch(
      () => inner(chat).deleteCollection("API"),
      team("team_2")
    )

    expect(reply).toMatch(/workspace changed/)
    expect(deleteTeamCollection).not.toHaveBeenCalled()
  })

  it("deletes no personal collection once the user left Personal", async () => {
    const reply = await approveAfterSwitch(
      () => inner(chat).deleteCollection("API"),
      team("team_1")
    )

    expect(reply).toMatch(/workspace changed/)
    expect(restCollectionStore.value.state.map((c) => c.name)).toEqual(["API"])
  })

  it.each([
    [
      "publish",
      () => backend.createPublishedDoc,
      (c: AIChatService) => inner(c).publishDocumentation("API"),
    ],
    [
      "public mock server",
      () => backend.createMockServer,
      (c: AIChatService) => inner(c).createMockServer("API"),
    ],
    [
      "mock server going public",
      () => backend.updateMockServer,
      (c: AIChatService) => inner(c).updateMockServer("M", { isPublic: true }),
    ],
    [
      "mock server delete",
      () => backend.deleteMockServer,
      (c: AIChatService) => inner(c).deleteMockServer("M"),
    ],
  ])("a %s approved after a switch does nothing", async (_, call, start) => {
    const reply = await approveAfterSwitch(() => start(chat), team("team_1"))

    expect(reply).toMatch(/workspace changed/)
    expect(call()).not.toHaveBeenCalled()
  })

  it("an unpublish approved after a switch does nothing", async () => {
    backend.getUserPublishedDocs.mockReturnValue(
      right([
        {
          id: "d1",
          title: "API",
          version: "CURRENT",
          autoSync: true,
          url: "https://docs.example/api",
          collection: { id: "srv_API" },
          createdOn: "",
          updatedOn: "",
        },
      ])
    )

    const reply = await approveAfterSwitch(
      () => inner(chat).unpublishDocumentation("API"),
      team("team_1")
    )

    expect(reply).toMatch(/workspace changed/)
    expect(backend.deletePublishedDoc).not.toHaveBeenCalled()
  })

  it("runs no personal collection once the user left Personal", async () => {
    setRESTCollections([
      {
        ...personalCollection(),
        requests: [
          { ...getDefaultRESTRequest(), endpoint: "https://api.example/x" },
        ],
      },
    ])
    // A host the chat set earlier: the run asks first.
    inner(chat).chatRisks.hosts.add("api.example")
    const runTests = vi
      .spyOn(runner, "runTests")
      .mockImplementation(() => undefined as never)

    const done = approveAfterSwitch(
      () => inner(chat).runCollection("API"),
      team("team_1")
    )
    const reply = await Promise.race([done, tick(500).then(() => "running")])

    expect(reply).toMatch(/workspace changed/)
    expect(runTests).not.toHaveBeenCalled()
  })

  it("still acts when the workspace stayed put", async () => {
    backend.deleteMockServer.mockReturnValue(right(true))

    inner(chat).pinWorkspace()
    const done = inner(chat).deleteMockServer("M")
    for (let i = 0; i < 50 && !chat.pendingConfirmation.value; i++) await tick()
    chat.resolveConfirmation(true)

    expect(await done).toContain("Deleted mock server")
    expect(backend.deleteMockServer).toHaveBeenCalledWith("m1")
  })
})
