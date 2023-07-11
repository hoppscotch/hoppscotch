import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  SpotlightSearcher,
  SpotlightSearcherSessionState,
  SpotlightSearcherResult,
  SpotlightService,
} from "../"
import { Ref, computed, nextTick, ref, watch } from "vue"
import { TestContainer } from "dioc/testing"

const echoSearcher: SpotlightSearcher = {
  searcherID: "echo-searcher",
  searcherSectionTitle: "Echo Searcher",
  createSearchSession: (query: Readonly<Ref<string>>) => {
    // A basic searcher that returns the query string as the sole result
    const loading = ref(false)
    const results = ref<SpotlightSearcherResult[]>([])

    watch(
      query,
      (query) => {
        loading.value = true

        results.value = [
          {
            id: "searcher-a-result",
            text: {
              type: "text",
              text: query,
            },
            icon: {},
            score: 1,
          },
        ]

        loading.value = false
      },
      { immediate: true }
    )

    const onSessionEnd = () => {
      /* noop */
    }

    return [
      computed<SpotlightSearcherSessionState>(() => ({
        loading: loading.value,
        results: results.value,
      })),
      onSessionEnd,
    ]
  },

  onResultSelect: () => {
    /* noop */
  },
}

const emptySearcher: SpotlightSearcher = {
  searcherID: "empty-searcher",
  searcherSectionTitle: "Empty Searcher",
  createSearchSession: () => {
    const loading = ref(false)

    return [
      computed<SpotlightSearcherSessionState>(() => ({
        loading: loading.value,
        results: [],
      })),
      () => {
        /* noop */
      },
    ]
  },
  onResultSelect: () => {
    /* noop */
  },
}

describe("SpotlightService", () => {
  describe("registerSearcher", () => {
    it("registers a searcher with a given ID", () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)

      const [id, searcher] = spotlight.getAllSearchers().next().value

      expect(id).toEqual("echo-searcher")
      expect(searcher).toBe(echoSearcher)
    })

    it("if 2 searchers are registered with the same ID, the last one overwrites the first one", () => {
      const echoSearcherFake: SpotlightSearcher = {
        searcherID: "echo-searcher",
        searcherSectionTitle: "Echo Searcher",
        createSearchSession: () => {
          throw new Error("not implemented")
        },
        onResultSelect: () => {
          throw new Error("not implemented")
        },
      }

      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)
      spotlight.registerSearcher(echoSearcherFake)

      const [id, searcher] = spotlight.getAllSearchers().next().value

      expect(id).toEqual("echo-searcher")
      expect(searcher).toBe(echoSearcherFake)
    })
  })

  describe("createSearchSession", () => {
    it("when the source query changes, the searchers are notified", async () => {
      const container = new TestContainer()

      const notifiedFn = vi.fn()

      const sampleSearcher: SpotlightSearcher = {
        searcherID: "searcher",
        searcherSectionTitle: "Searcher",
        createSearchSession: (query) => {
          const stop = watch(query, notifiedFn, { immediate: true })

          return [
            ref<SpotlightSearcherSessionState>({
              loading: false,
              results: [],
            }),
            () => {
              stop()
            },
          ]
        },
        onResultSelect: () => {
          /* noop */
        },
      }

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(sampleSearcher)

      const query = ref("test")

      const [, dispose] = spotlight.createSearchSession(query)

      query.value = "test2"
      await nextTick()

      expect(notifiedFn).toHaveBeenCalledTimes(2)

      dispose()
    })

    it("when a searcher returns results, they are added to the results", async () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)

      const query = ref("test")
      const [session, dispose] = spotlight.createSearchSession(query)
      await nextTick()

      expect(session.value.results).toHaveProperty("echo-searcher")
      expect(session.value.results["echo-searcher"]).toEqual({
        title: "Echo Searcher",
        avgScore: 1,
        results: [
          {
            id: "searcher-a-result",
            text: {
              type: "text",
              text: "test",
            },
            icon: {},
            score: 1,
          },
        ],
      })

      dispose()
    })

    it("when a searcher does not return any results, they are not added to the results", () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(emptySearcher)

      const query = ref("test")
      const [session, dispose] = spotlight.createSearchSession(query)

      expect(session.value.results).not.toHaveProperty("empty-searcher")
      expect(session.value.results).toEqual({})

      dispose()
    })

    it("when any of the searchers report they are loading, the search session says it is loading", () => {
      const container = new TestContainer()

      const loadingSearcher: SpotlightSearcher = {
        searcherID: "loading-searcher",
        searcherSectionTitle: "Loading Searcher",
        createSearchSession: () => {
          const loading = ref(true)
          const results = ref<SpotlightSearcherResult[]>([])

          return [
            computed<SpotlightSearcherSessionState>(() => ({
              loading: loading.value,
              results: results.value,
            })),
            () => {
              /* noop */
            },
          ]
        },
        onResultSelect: () => {
          /* noop */
        },
      }

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(loadingSearcher)
      spotlight.registerSearcher(echoSearcher)

      const query = ref("test")
      const [session, dispose] = spotlight.createSearchSession(query)

      expect(session.value.loading).toBe(true)

      dispose()
    })

    it("when all of the searchers report they are not loading, the search session says it is not loading", () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)
      spotlight.registerSearcher(emptySearcher)

      const query = ref("test")
      const [session, dispose] = spotlight.createSearchSession(query)

      expect(session.value.loading).toBe(false)

      dispose()
    })

    it("when a searcher changes its loading state after a while, the search session state updates", async () => {
      const container = new TestContainer()

      const loading = ref(true)

      const loadingSearcher: SpotlightSearcher = {
        searcherID: "loading-searcher",
        searcherSectionTitle: "Loading Searcher",
        createSearchSession: () => {
          return [
            computed<SpotlightSearcherSessionState>(() => ({
              loading: loading.value,
              results: [],
            })),
            () => {
              /* noop */
            },
          ]
        },
        onResultSelect: () => {
          /* noop */
        },
      }

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(loadingSearcher)

      const query = ref("test")
      const [session, dispose] = spotlight.createSearchSession(query)

      expect(session.value.loading).toBe(true)

      loading.value = false

      await nextTick()

      expect(session.value.loading).toBe(false)

      dispose()
    })

    it("when the searcher updates its results, the search session state updates", async () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)

      const query = ref("test")
      const [session, dispose] = spotlight.createSearchSession(query)

      expect(session.value.results).toHaveProperty("echo-searcher")
      expect(session.value.results["echo-searcher"]).toEqual({
        title: "Echo Searcher",
        avgScore: 1,
        results: [
          {
            id: "searcher-a-result",
            text: {
              type: "text",
              text: "test",
            },
            icon: {},
            score: 1,
          },
        ],
      })

      query.value = "test2"
      await nextTick()

      expect(session.value.results).toHaveProperty("echo-searcher")
      expect(session.value.results["echo-searcher"]).toEqual({
        title: "Echo Searcher",
        avgScore: 1,
        results: [
          {
            id: "searcher-a-result",
            text: {
              type: "text",
              text: "test2",
            },
            icon: {},
            score: 1,
          },
        ],
      })

      dispose()
    })

    it("when the returned dispose function is called, the searchers are notified", () => {
      const container = new TestContainer()

      const disposeFn = vi.fn()

      const testSearcher: SpotlightSearcher = {
        searcherID: "test-searcher",
        searcherSectionTitle: "Test Searcher",
        createSearchSession: () => {
          return [
            computed<SpotlightSearcherSessionState>(() => ({
              loading: false,
              results: [],
            })),
            disposeFn,
          ]
        },
        onResultSelect: () => {
          /* noop */
        },
      }

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(testSearcher)

      const query = ref("test")
      const [, dispose] = spotlight.createSearchSession(query)

      dispose()

      expect(disposeFn).toHaveBeenCalledOnce()
    })

    it("when the search session is disposed, changes to the query are not notified to the searchers", async () => {
      const container = new TestContainer()

      const notifiedFn = vi.fn()

      const testSearcher: SpotlightSearcher = {
        searcherID: "test-searcher",
        searcherSectionTitle: "Test Searcher",
        createSearchSession: (query) => {
          watch(query, notifiedFn, { immediate: true })

          return [
            computed<SpotlightSearcherSessionState>(() => ({
              loading: false,
              results: [],
            })),
            () => {
              /* noop */
            },
          ]
        },
        onResultSelect: () => {
          /* noop */
        },
      }

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(testSearcher)

      const query = ref("test")
      const [, dispose] = spotlight.createSearchSession(query)

      query.value = "test2"
      await nextTick()

      expect(notifiedFn).toHaveBeenCalledTimes(2)

      dispose()

      query.value = "test3"
      await nextTick()

      expect(notifiedFn).toHaveBeenCalledTimes(3)
    })

    describe("selectSearchResult", () => {
      const onResultSelectFn = vi.fn()

      const testSearcher: SpotlightSearcher = {
        searcherID: "test-searcher",
        searcherSectionTitle: "Test Searcher",
        createSearchSession: () => {
          return [
            computed<SpotlightSearcherSessionState>(() => ({
              loading: false,
              results: [],
            })),
            () => {
              /* noop */
            },
          ]
        },
        onResultSelect: onResultSelectFn,
      }

      beforeEach(() => {
        onResultSelectFn.mockReset()
      })

      it("does nothing if the searcherID is invalid", () => {
        const container = new TestContainer()

        const spotlight = container.bind(SpotlightService)
        spotlight.registerSearcher(testSearcher)

        spotlight.selectSearchResult("invalid-searcher-id", {
          id: "test-result",
          text: {
            type: "text",
            text: "test",
          },
          icon: {},
          score: 1,
        })

        expect(onResultSelectFn).not.toHaveBeenCalled()
      })

      it("calls the correspondig searcher's onResultSelect method", () => {
        const container = new TestContainer()

        const spotlight = container.bind(SpotlightService)
        spotlight.registerSearcher(testSearcher)

        spotlight.selectSearchResult("test-searcher", {
          id: "test-result",
          text: {
            type: "text",
            text: "test",
          },
          icon: {},
          score: 1,
        })

        expect(onResultSelectFn).toHaveBeenCalledOnce()
      })

      it("passes the correct information to the searcher's onResultSelect method", () => {
        const container = new TestContainer()

        const spotlight = container.bind(SpotlightService)
        spotlight.registerSearcher(testSearcher)

        spotlight.selectSearchResult("test-searcher", {
          id: "test-result",
          text: {
            type: "text",
            text: "test",
          },
          icon: {},
          score: 1,
        })

        expect(onResultSelectFn).toHaveBeenCalledWith({
          id: "test-result",
          text: {
            type: "text",
            text: "test",
          },
          icon: {},
          score: 1,
        })
      })
    })
  })

  describe("getAllSearchers", () => {
    it("when no searchers are registered, it returns an empty array", () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)

      expect(Array.from(spotlight.getAllSearchers())).toEqual([])
    })

    it("when a searcher is registered, it returns an array with a tuple of the searcher id and then then searcher", () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)

      expect(Array.from(spotlight.getAllSearchers())).toEqual([
        ["echo-searcher", echoSearcher],
      ])
    })

    it("returns all registered searchers", () => {
      const container = new TestContainer()

      const spotlight = container.bind(SpotlightService)
      spotlight.registerSearcher(echoSearcher)
      spotlight.registerSearcher(emptySearcher)

      expect(Array.from(spotlight.getAllSearchers())).toEqual([
        ["echo-searcher", echoSearcher],
        ["empty-searcher", emptySearcher],
      ])
    })
  })
})
