import { TestContainer } from "dioc/testing"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HistorySpotlightSearcherService } from "../history.searcher"
import { nextTick, ref } from "vue"
import { SpotlightService } from "../.."
import { RESTHistoryEntry } from "~/newstore/history"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

async function flushPromises() {
  return await new Promise((r) => setTimeout(r))
}

const tabMock = vi.hoisted(() => ({
  createNewTab: vi.fn(),
}))

vi.mock("~/helpers/rest/tab", () => ({
  __esModule: true,
  createNewTab: tabMock.createNewTab,
}))

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

const actionsMock = vi.hoisted(() => ({
  value: [] as string[],
  invokeAction: vi.fn(),
}))

vi.mock("~/helpers/actions", async () => {
  const { BehaviorSubject }: any = await vi.importActual("rxjs")

  return {
    __esModule: true,
    activeActions$: new BehaviorSubject(actionsMock.value),
    invokeAction: actionsMock.invokeAction,
  }
})

const historyMock = vi.hoisted(() => ({
  entries: [] as RESTHistoryEntry[],
}))

vi.mock("~/newstore/history", () => ({
  __esModule: true,
  restHistoryStore: {
    value: {
      state: historyMock.entries,
    },
  },
}))

describe("HistorySpotlightSearcherService", () => {
  beforeEach(() => {
    let x = actionsMock.value.pop()
    while (x) {
      x = actionsMock.value.pop()
    }

    let y = historyMock.entries.pop()
    while (y) {
      y = historyMock.entries.pop()
    }

    actionsMock.invokeAction.mockReset()
    tabMock.createNewTab.mockReset()
  })

  it("registers with the spotlight service upon initialization", async () => {
    const container = new TestContainer()

    const registerSearcherFn = vi.fn()

    container.bindMock(SpotlightService, {
      registerSearcher: registerSearcherFn,
    })

    const history = container.bind(HistorySpotlightSearcherService)
    await flushPromises()

    expect(registerSearcherFn).toHaveBeenCalledOnce()
    expect(registerSearcherFn).toHaveBeenCalledWith(history)
  })

  it("returns a clear history result if the action is available", async () => {
    const container = new TestContainer()

    actionsMock.value.push("history.clear")
    const history = container.bind(HistorySpotlightSearcherService)
    await flushPromises()

    const query = ref("his")
    const [result] = history.createSearchSession(query)
    await nextTick()

    expect(result.value.results).toContainEqual(
      expect.objectContaining({
        id: "clear-history",
      })
    )
  })

  it("doesn't return a clear history result if the action is not available", async () => {
    const container = new TestContainer()

    const history = container.bind(HistorySpotlightSearcherService)
    await flushPromises()

    const query = ref("his")
    const [result] = history.createSearchSession(query)
    await nextTick()

    expect(result.value.results).not.toContainEqual(
      expect.objectContaining({
        id: "clear-history",
      })
    )
  })

  it("selecting a clear history entry invokes the clear history action", async () => {
    const container = new TestContainer()

    actionsMock.value.push("history.clear")
    const history = container.bind(HistorySpotlightSearcherService)
    await flushPromises()

    const query = ref("his")
    const [result] = history.createSearchSession(query)
    await nextTick()

    history.onResultSelect(result.value.results[0])

    expect(actionsMock.invokeAction).toHaveBeenCalledOnce()
    expect(actionsMock.invokeAction).toHaveBeenCalledWith("history.clear")
  })

  it("returns all the valid history entries for the search term", async () => {
    historyMock.entries.push({
      request: {
        ...getDefaultRESTRequest(),
        endpoint: "bla.com",
      },
      responseMeta: {
        duration: null,
        statusCode: null,
      },
      star: false,
      v: 1,
      updatedOn: new Date(),
    })

    const container = new TestContainer()

    const history = container.bind(HistorySpotlightSearcherService)
    await flushPromises()

    const query = ref("bla")
    const [result] = history.createSearchSession(query)
    await nextTick()

    expect(result.value.results).toContainEqual(
      expect.objectContaining({
        id: "0",
        text: {
          type: "custom",
          component: expect.anything(),
          componentProps: expect.objectContaining({
            historyEntry: historyMock.entries[0],
          }),
        },
      })
    )
  })

  it("selecting a history entry asks the tab system to open a new tab", async () => {
    historyMock.entries.push({
      request: {
        ...getDefaultRESTRequest(),
        endpoint: "bla.com",
      },
      responseMeta: {
        duration: null,
        statusCode: null,
      },
      star: false,
      v: 1,
      updatedOn: new Date(),
    })

    const container = new TestContainer()

    const history = container.bind(HistorySpotlightSearcherService)
    await flushPromises()

    const query = ref("bla")
    const [result] = history.createSearchSession(query)
    await nextTick()

    const doc = result.value.results[0]

    history.onResultSelect(doc)

    expect(tabMock.createNewTab).toHaveBeenCalledOnce()
    expect(tabMock.createNewTab).toHaveBeenCalledWith({
      request: historyMock.entries[0].request,
      isDirty: false,
    })
  })
})
