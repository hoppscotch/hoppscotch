import { describe, it, expect, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { ref, nextTick } from "vue"
import * as E from "fp-ts/Either"
import { SwitchWorkspaceSpotlightSearcherService } from "../workspace.searcher"
import { SpotlightService } from "../.."
import { WorkspaceService } from "~/services/workspace.service"
import { platform } from "~/platform"

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

vi.mock("~/platform", () => ({
  platform: {
    auth: {
      getCurrentUser: vi.fn(),
    },
    backend: {
      getUserTeams: vi.fn(),
    },
  },
}))

async function flushPromises() {
  return await new Promise((r) => setTimeout(r))
}

const makeTeam = (id: string) => ({ id, name: `Team ${id}` })

describe("SwitchWorkspaceSpotlightSearcherService: team pagination", () => {
  // hoppscotch/hoppscotch#6096: fetchMyTeams() computed a pagination cursor
  // but only ever called getUserTeams() once, so with more teams than fit
  // on a single backend page, teams past the first page were never added
  // to the search index and couldn't be found.
  it("fetches every page of teams, not just the first", async () => {
    const container = new TestContainer()

    container.bindMock(SpotlightService, {
      registerSearcher: vi.fn(),
    })

    container.bindMock(WorkspaceService, {
      currentWorkspace: ref({ type: "personal" }),
    })

    vi.mocked(platform.auth.getCurrentUser).mockReturnValue({} as any)

    // 12 teams total, backend page size is 10 - so this only resolves
    // correctly if a second page is fetched using the returned cursor.
    const page1 = Array.from({ length: 10 }, (_, i) => makeTeam(`${i + 1}`))
    const page2 = [makeTeam("11"), makeTeam("12")]

    vi.mocked(platform.backend.getUserTeams).mockImplementation(
      async (cursor?: string) =>
        cursor
          ? (E.right({ myTeams: page2 }) as any)
          : (E.right({ myTeams: page1 }) as any)
    )

    const searcher = container.bind(SwitchWorkspaceSpotlightSearcherService)

    const query = ref("")
    const [state] = searcher.createSearchSession(query)

    // let fetchMyTeams's pagination loop resolve and populate the index
    await flushPromises()

    query.value = "Team 12"
    await nextTick()

    expect(platform.backend.getUserTeams).toHaveBeenCalledTimes(2)
    expect(state.value.results).toContainEqual(
      expect.objectContaining({ id: "workspace-12" })
    )
  })

  it("stops after a single page when there's no more data", async () => {
    const container = new TestContainer()

    container.bindMock(SpotlightService, {
      registerSearcher: vi.fn(),
    })

    container.bindMock(WorkspaceService, {
      currentWorkspace: ref({ type: "personal" }),
    })

    vi.mocked(platform.auth.getCurrentUser).mockReturnValue({} as any)

    const page1 = [makeTeam("1"), makeTeam("2")]

    vi.mocked(platform.backend.getUserTeams).mockResolvedValue(
      E.right({ myTeams: page1 }) as any
    )

    const searcher = container.bind(SwitchWorkspaceSpotlightSearcherService)

    const query = ref("")
    searcher.createSearchSession(query)

    await flushPromises()

    expect(platform.backend.getUserTeams).toHaveBeenCalledTimes(1)
  })
})
