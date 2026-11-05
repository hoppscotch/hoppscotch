import { describe, it, expect, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import {
  CollectionUpdateSource,
  CollectionUpdateSourceService,
} from "../collection-update-source.service"

describe("CollectionUpdateSourceService", () => {
  let container: TestContainer
  let service: CollectionUpdateSourceService

  beforeEach(() => {
    container = new TestContainer()
    service = container.bind(CollectionUpdateSourceService)
  })

  describe("setUpdateSource & getUpdateSource", () => {
    it("should set and retrieve an update source for a given collection ID", () => {
      const id = "col_123"
      const source: CollectionUpdateSource = {
        importerId: "hopp_openapi",
        sourceId: "url_import",
        sourceType: "url",
        url: "https://petstore.swagger.io/v2/swagger.json",
        updatedAt: 1700000000000,
      }

      service.setUpdateSource(id, source)
      expect(service.getUpdateSource(id)).toEqual(source)
    })

    it("should return undefined for a non-existent collection ID", () => {
      expect(service.getUpdateSource("non_existent")).toBeUndefined()
    })
  })

  describe("removeUpdateSource", () => {
    it("should remove an update source for a given collection ID", () => {
      const id = "col_123"
      const source: CollectionUpdateSource = {
        importerId: "hopp_postman",
        sourceType: "file",
        fileName: "postman_collection.json",
        updatedAt: 1700000000000,
      }

      service.setUpdateSource(id, source)
      service.removeUpdateSource(id)

      expect(service.getUpdateSource(id)).toBeUndefined()
    })
  })

  describe("clearAllUpdateSources", () => {
    it("should clear all update sources", () => {
      service.setUpdateSource("col_1", {
        importerId: "hopp_rest",
        sourceType: "file",
        fileName: "hopp.json",
      })
      service.setUpdateSource("col_2", {
        importerId: "hopp_gist",
        sourceType: "url",
        url: "https://gist.github.com/abc",
      })

      service.clearAllUpdateSources()

      expect(service.updateSources.size).toBe(0)
    })
  })

  describe("loadUpdateSourcesFromPersistedState", () => {
    it("should load update sources from persisted state", () => {
      const state: Record<string, CollectionUpdateSource> = {
        col_1: {
          importerId: "hopp_openapi",
          sourceId: "url_import",
          sourceType: "url",
          url: "https://example.com/api.json",
        },
        col_2: {
          importerId: "hopp_insomnia",
          sourceType: "file",
          fileName: "insomnia.json",
        },
      }

      service.loadUpdateSourcesFromPersistedState(state)

      expect(service.getUpdateSource("col_1")).toEqual(state.col_1)
      expect(service.getUpdateSource("col_2")).toEqual(state.col_2)
    })

    it("should clear existing sources before loading new ones", () => {
      service.setUpdateSource("old_col", {
        importerId: "hopp_rest",
        sourceType: "file",
      })

      const state: Record<string, CollectionUpdateSource> = {
        new_col: {
          importerId: "hopp_openapi",
          sourceType: "url",
          url: "https://new.com/api.json",
        },
      }

      service.loadUpdateSourcesFromPersistedState(state)

      expect(service.getUpdateSource("old_col")).toBeUndefined()
      expect(service.getUpdateSource("new_col")).toEqual(state.new_col)
    })
  })

  describe("persistableUpdateSources", () => {
    it("should return a persistable object of update sources", () => {
      const id = "col_123"
      const source: CollectionUpdateSource = {
        importerId: "hopp_openapi",
        sourceType: "url",
        url: "https://petstore.swagger.io/v2/swagger.json",
      }
      service.setUpdateSource(id, source)

      expect(service.persistableUpdateSources.value).toEqual({
        [id]: source,
      })
    })

    it("should return an empty object when no sources exist", () => {
      expect(service.persistableUpdateSources.value).toEqual({})
    })
  })
})
