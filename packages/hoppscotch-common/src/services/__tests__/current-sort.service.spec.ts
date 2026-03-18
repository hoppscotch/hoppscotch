import { describe, it, expect, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import {
  CurrentSortOption,
  CurrentSortValuesService,
} from "../current-sort.service"

describe("CurrentSortValuesService", () => {
  let container: TestContainer
  let service: CurrentSortValuesService

  beforeEach(() => {
    container = new TestContainer()
    service = container.bind(CurrentSortValuesService)
  })

  describe("setSortOption & getSortOption", () => {
    it("should set and retrieve a sort option for a given ID", () => {
      const id = "col1"
      const option: CurrentSortOption = { sortBy: "name", sortOrder: "asc" }

      service.setSortOption(id, option)
      expect(service.getSortOption(id)).toEqual(option)
    })

    it("should return undefined for a non-existent ID", () => {
      expect(service.getSortOption("missing")).toBeUndefined()
    })
  })

  describe("removeSortOption", () => {
    it("should remove a sort option for a given ID", () => {
      const id = "col1"
      const option: CurrentSortOption = { sortBy: "name", sortOrder: "asc" }

      service.setSortOption(id, option)
      service.removeSortOption(id)

      expect(service.getSortOption(id)).toBeUndefined()
    })
  })

  describe("clearAllSortOptions", () => {
    it("should clear all sort options", () => {
      service.setSortOption("col1", { sortBy: "name", sortOrder: "asc" })
      service.setSortOption("col2", { sortBy: "name", sortOrder: "desc" })

      service.clearAllSortOptions()

      expect(service.currentSortOptions.size).toBe(0)
    })
  })

  describe("loadCurrentSortValuesFromPersistedState", () => {
    it("should load sort options from persisted state", () => {
      const state = {
        col1: { sortBy: "name", sortOrder: "asc" } as CurrentSortOption,
        col2: { sortBy: "name", sortOrder: "desc" } as CurrentSortOption,
      }

      service.loadCurrentSortValuesFromPersistedState(state)

      expect(service.getSortOption("col1")).toEqual(state.col1)
      expect(service.getSortOption("col2")).toEqual(state.col2)
    })

    it("should clear existing options before loading", () => {
      service.setSortOption("old", { sortBy: "name", sortOrder: "asc" })

      const state = {
        new: { sortBy: "name", sortOrder: "desc" } as CurrentSortOption,
      }

      service.loadCurrentSortValuesFromPersistedState(state)

      expect(service.getSortOption("old")).toBeUndefined()
      expect(service.getSortOption("new")).toEqual(state.new)
    })
  })

  describe("persistableCurrentSortValues", () => {
    it("should return a persistable object of current sort options", () => {
      const id = "col1"
      const option: CurrentSortOption = { sortBy: "name", sortOrder: "asc" }
      service.setSortOption(id, option)

      expect(service.persistableCurrentSortValues.value).toEqual({
        [id]: option,
      })
    })

    it("should return an empty object when no sort options exist", () => {
      expect(service.persistableCurrentSortValues.value).toEqual({})
    })
  })
})
