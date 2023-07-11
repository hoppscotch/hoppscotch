import { describe, it, expect, vi } from "vitest"
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "../static.searcher"
import { nextTick, reactive, ref } from "vue"
import { SpotlightSearcherResult } from "../../.."
import { TestContainer } from "dioc/testing"

async function flushPromises() {
  return await new Promise((r) => setTimeout(r))
}

describe("StaticSpotlightSearcherService", () => {
  it("returns docs that have excludeFromSearch set to false", async () => {
    class TestSearcherService extends StaticSpotlightSearcherService<
      Record<string, any>
    > {
      public static readonly ID = "TEST_SEARCHER_SERVICE"

      public readonly searcherID = "test"
      public searcherSectionTitle = "test"

      private documents: Record<string, any> = reactive({
        login: {
          text: "Login",
          excludeFromSearch: false,
        },
        logout: {
          text: "Logout",
          excludeFromSearch: false,
        },
      })

      constructor() {
        super({
          searchFields: ["text"],
          fieldWeights: {},
        })

        this.setDocuments(this.documents)
      }

      protected getSearcherResultForSearchResult(
        result: SearchResult<Record<string, any>>
      ): SpotlightSearcherResult {
        return {
          id: result.id,
          icon: {},
          text: { type: "text", text: result.doc.text },
          score: result.score,
        }
      }

      public onDocSelected(): void {
        // noop
      }
    }

    const container = new TestContainer()

    const service = container.bind(TestSearcherService)
    await flushPromises()

    const query = ref("log")

    const [results] = service.createSearchSession(query)
    await nextTick()

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )
  })

  it("doesn't return docs that have excludeFromSearch set to true", async () => {
    class TestSearcherServiceB extends StaticSpotlightSearcherService<
      Record<string, any>
    > {
      public static readonly ID = "TEST_SEARCHER_SERVICE_B"

      public readonly searcherID = "test"
      public searcherSectionTitle = "test"

      private documents: Record<string, any> = reactive({
        login: {
          text: "Login",
          excludeFromSearch: true,
        },
        logout: {
          text: "Logout",
          excludeFromSearch: false,
        },
      })

      constructor() {
        super({
          searchFields: ["text"],
          fieldWeights: {},
        })

        this.setDocuments(this.documents)
      }

      protected getSearcherResultForSearchResult(
        result: SearchResult<Record<string, any>>
      ): SpotlightSearcherResult {
        return {
          id: result.id,
          icon: {},
          text: { type: "text", text: result.doc.text },
          score: result.score,
        }
      }

      public onDocSelected(): void {
        // noop
      }
    }

    const container = new TestContainer()

    const service = container.bind(TestSearcherServiceB)
    await flushPromises()

    const query = ref("log")
    const [results] = service.createSearchSession(query)
    await nextTick()

    expect(results.value.results).not.toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "logout",
      })
    )
  })

  it("returns docs that have excludeFromSearch set to undefined", async () => {
    class TestSearcherServiceC extends StaticSpotlightSearcherService<
      Record<string, any>
    > {
      public static readonly ID = "TEST_SEARCHER_SERVICE_C"

      public readonly searcherID = "test"
      public searcherSectionTitle = "test"

      private documents: Record<string, any> = reactive({
        login: {
          text: "Login",
        },
        logout: {
          text: "Logout",
        },
      })

      constructor() {
        super({
          searchFields: ["text"],
          fieldWeights: {},
        })

        this.setDocuments(this.documents)
      }

      protected getSearcherResultForSearchResult(
        result: SearchResult<Record<string, any>>
      ): SpotlightSearcherResult {
        return {
          id: result.id,
          icon: {},
          text: { type: "text", text: result.doc.text },
          score: result.score,
        }
      }

      public onDocSelected(): void {
        // noop
      }
    }

    const container = new TestContainer()

    const service = container.bind(TestSearcherServiceC)
    await flushPromises()

    const query = ref("log")
    const [results] = service.createSearchSession(query)
    await nextTick()

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "logout",
      })
    )
  })

  it("onDocSelected is called with a valid doc id and doc when onResultSelect is called", async () => {
    class TestSearcherServiceD extends StaticSpotlightSearcherService<
      Record<string, any>
    > {
      public static readonly ID = "TEST_SEARCHER_SERVICE_D"

      public readonly searcherID = "test"
      public searcherSectionTitle = "test"

      public documents: Record<string, any> = reactive({
        login: {
          text: "Login",
        },
        logout: {
          text: "Logout",
        },
      })

      constructor() {
        super({
          searchFields: ["text"],
          fieldWeights: {},
        })

        this.setDocuments(this.documents)
      }

      protected getSearcherResultForSearchResult(
        result: SearchResult<Record<string, any>>
      ): SpotlightSearcherResult {
        return {
          id: result.id,
          icon: {},
          text: { type: "text", text: result.doc.text },
          score: result.score,
        }
      }

      public onDocSelected = vi.fn()
    }

    const container = new TestContainer()

    const service = container.bind(TestSearcherServiceD)
    await flushPromises()

    const query = ref("log")
    const [results] = service.createSearchSession(query)
    await nextTick()

    const doc = results.value.results[0]

    service.onResultSelect(doc)

    expect(service.onDocSelected).toHaveBeenCalledOnce()
    expect(service.onDocSelected).toHaveBeenCalledWith(
      doc.id,
      service.documents["login"]
    )
  })

  it("returns search results from entries as specified by getSearcherResultForSearchResult", async () => {
    class TestSearcherServiceE extends StaticSpotlightSearcherService<
      Record<string, any>
    > {
      public static readonly ID = "TEST_SEARCHER_SERVICE_E"

      public readonly searcherID = "test"
      public searcherSectionTitle = "test"

      public documents: Record<string, any> = reactive({
        login: {
          text: "Login",
        },
        logout: {
          text: "Logout",
        },
      })

      constructor() {
        super({
          searchFields: ["text"],
          fieldWeights: {},
        })

        this.setDocuments(this.documents)
      }

      protected getSearcherResultForSearchResult(
        result: SearchResult<Record<string, any>>
      ): SpotlightSearcherResult {
        return {
          id: result.id,
          icon: {},
          text: { type: "text", text: result.doc.text.toUpperCase() },
          score: result.score,
        }
      }

      public onDocSelected(): void {
        // noop
      }
    }

    const container = new TestContainer()

    const service = container.bind(TestSearcherServiceE)
    await flushPromises()

    const query = ref("log")
    const [results] = service.createSearchSession(query)
    await nextTick()

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "login",
        text: { type: "text", text: "LOGIN" },
      })
    )

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "logout",
        text: { type: "text", text: "LOGOUT" },
      })
    )
  })

  it("indexes the documents by the 'searchFields' property and obeys multiple index fields", async () => {
    class TestSearcherServiceF extends StaticSpotlightSearcherService<
      Record<string, any>
    > {
      public static readonly ID = "TEST_SEARCHER_SERVICE_F"

      public readonly searcherID = "test"
      public searcherSectionTitle = "test"

      public documents: Record<string, any> = reactive({
        login: {
          text: "Login",
          alternate: ["sign in"],
        },
        logout: {
          text: "Logout",
          alternate: ["sign out"],
        },
      })

      constructor() {
        super({
          searchFields: ["text", "alternate"],
          fieldWeights: {},
        })

        this.setDocuments(this.documents)
      }

      protected getSearcherResultForSearchResult(
        result: SearchResult<Record<string, any>>
      ): SpotlightSearcherResult {
        return {
          id: result.id,
          icon: {},
          text: { type: "text", text: result.doc.text },
          score: result.score,
        }
      }

      public onDocSelected(): void {
        // noop
      }
    }

    const container = new TestContainer()

    const service = container.bind(TestSearcherServiceF)
    await flushPromises()

    const query = ref("sign")
    const [results] = service.createSearchSession(query)
    await nextTick()

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )

    expect(results.value.results).toContainEqual(
      expect.objectContaining({
        id: "logout",
      })
    )
  })
})
