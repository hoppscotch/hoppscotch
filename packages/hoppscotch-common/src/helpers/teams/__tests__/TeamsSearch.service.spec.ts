import { getDefaultRESTRequest } from "@hoppscotch/data"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TeamSearchService } from "../TeamsSearch.service"

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  getSingleCollection: vi.fn(),
  getSingleRequest: vi.fn(),
}))

vi.mock("axios", () => ({
  __esModule: true,
  default: { get: mocks.axiosGet },
}))

vi.mock("~/platform", () => ({
  __esModule: true,
  platform: {
    auth: {
      waitProbableLoginToConfirm: () => Promise.resolve(),
      axiosPlatformConfig: () => ({}),
    },
  },
}))

vi.mock("../TeamCollection", () => ({
  __esModule: true,
  getSingleCollection: mocks.getSingleCollection,
}))

vi.mock("../TeamRequest", () => ({
  __esModule: true,
  getSingleRequest: mocks.getSingleRequest,
  getCollectionChildRequests: vi.fn(),
  getCollectionChildCollections: vi.fn(),
}))

vi.mock("@hoppscotch/js-sandbox/scripting", () => ({
  __esModule: true,
  hasActualScript: () => false,
}))

const restRequest = (name: string) => ({
  ...getDefaultRESTRequest(),
  name,
})

// Search response from a backend that sends the full request and collection data
const searchHit = (requestTitle: string, folderTitle: string) => ({
  type: "request",
  id: `req-${requestTitle}`,
  title: requestTitle,
  method: "GET",
  request: restRequest(requestTitle),
  path: [
    {
      type: "collection",
      id: `col-${folderTitle}`,
      title: folderTitle,
      data: null,
      path: [],
    },
  ],
})

const okResponse = (data: unknown[]) => ({ status: 200, data: { data } })

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const requestTitles = (service: TeamSearchService) =>
  service.teamsSearchResults.value.flatMap(
    (col) => col.requests?.map((req) => req.title) ?? []
  )

describe("TeamSearchService.searchTeams", () => {
  let service: TeamSearchService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new TestContainer().bind(TeamSearchService)
  })

  it("asks the backend for a bounded number of results", async () => {
    mocks.axiosGet.mockResolvedValueOnce(okResponse([]))

    await service.searchTeams("image", "team-1")

    expect(mocks.axiosGet).toHaveBeenCalledTimes(1)
    expect(mocks.axiosGet.mock.calls[0][0]).toContain(
      "/team-collection/search/team-1?searchQuery=image&take=100&skip=0"
    )
  })

  it("does not fetch each result again when the backend sends the details", async () => {
    mocks.axiosGet.mockResolvedValueOnce(
      okResponse([searchHit("Get image details", "Images")])
    )

    await service.searchTeams("image", "team-1")

    expect(mocks.getSingleRequest).not.toHaveBeenCalled()
    expect(mocks.getSingleCollection).not.toHaveBeenCalled()
    expect(requestTitles(service)).toEqual(["Get image details"])
    expect(service.teamsSearchResults.value[0].requests?.[0].request.name).toBe(
      "Get image details"
    )
  })

  it("fetches the details an older backend leaves out", async () => {
    mocks.axiosGet.mockResolvedValueOnce(
      okResponse([
        {
          type: "request",
          id: "req-1",
          title: "Get image details",
          method: "GET",
          path: [
            { type: "collection", id: "col-1", title: "Images", path: [] },
          ],
        },
      ])
    )
    mocks.getSingleRequest.mockResolvedValueOnce(
      E.right({
        request: {
          id: "req-1",
          title: "Get image details",
          collectionID: "col-1",
          request: JSON.stringify(restRequest("Get image details")),
        },
      })
    )
    mocks.getSingleCollection.mockResolvedValueOnce(
      E.right({ collection: { id: "col-1", data: null } })
    )

    await service.searchTeams("image", "team-1")

    expect(mocks.getSingleRequest).toHaveBeenCalledWith("req-1")
    expect(mocks.getSingleCollection).toHaveBeenCalledWith("col-1")
    expect(requestTitles(service)).toEqual(["Get image details"])
  })

  it("keeps the newest results when an older search finishes last", async () => {
    const slowSearch = deferred<unknown>()
    mocks.axiosGet
      .mockReturnValueOnce(slowSearch.promise)
      .mockResolvedValueOnce(
        okResponse([searchHit("Get image details", "Images")])
      )

    const olderSearch = service.searchTeams("i", "team-1")
    await service.searchTeams("image", "team-1")

    slowSearch.resolve(okResponse([searchHit("Login", "Auth")]))
    await olderSearch

    expect(requestTitles(service)).toEqual(["Get image details"])
    expect(service.teamsSearchResultsLoading.value).toBe(false)
  })

  it("drops a pending search when the query is cleared", async () => {
    const slowSearch = deferred<unknown>()
    mocks.axiosGet.mockReturnValueOnce(slowSearch.promise)

    const pendingSearch = service.searchTeams("image", "team-1")
    await service.searchTeams("", "team-1")

    slowSearch.resolve(okResponse([searchHit("Get image details", "Images")]))
    await pendingSearch

    expect(service.teamsSearchResults.value).toEqual([])
    expect(service.teamsSearchResultsLoading.value).toBe(false)
  })

  it("stops loading when the backend answers with an error status", async () => {
    mocks.axiosGet.mockResolvedValueOnce({ status: 500, data: {} })

    await service.searchTeams("image", "team-1")

    expect(service.teamsSearchResultsLoading.value).toBe(false)
  })
})
