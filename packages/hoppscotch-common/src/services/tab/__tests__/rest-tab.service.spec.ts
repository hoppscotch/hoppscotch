import { describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"

import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTSaveContext } from "~/helpers/rest/document"
import { RESTTabService } from "../rest"

// The persistence import drags in stores with top-level side effects that
// can't run in this bare container; matching never touches it (hoisted mock)
vi.mock("../../persistence", () => ({
  PersistenceService: class {},
  STORE_KEYS: {},
}))

const makeService = () => {
  const container = new TestContainer()
  return container.bind(RESTTabService)
}

const openRequestTab = (
  service: RESTTabService,
  saveContext: HoppRESTSaveContext,
  requestFields?: { _ref_id?: string; id?: string }
) =>
  service.createNewTab({
    type: "request",
    request: { ...getDefaultRESTRequest(), ...requestFields },
    isDirty: false,
    saveContext,
  })

describe("RESTTabService", () => {
  describe("getTabRefWithSaveContext", () => {
    it("matches positionally when neither side has a requestRefID", () => {
      const service = makeService()

      const tab = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      const found = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      expect(found?.value.id).toEqual(tab.id)
    })

    it("does not match a different position when neither side has a requestRefID", () => {
      const service = makeService()

      openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      expect(
        service.getTabRefWithSaveContext({
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 0,
        })
      ).toBeNull()
    })

    it("matches on requestRefID even when the tab's index has drifted", () => {
      const service = makeService()

      const tab = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "req_a",
      })

      const found = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 0,
        requestRefID: "req_a",
      })

      expect(found?.value.id).toEqual(tab.id)
    })

    it("does not match a tab holding a different request at the same position", () => {
      const service = makeService()

      openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 0,
        requestRefID: "req_other",
      })

      expect(
        service.getTabRefWithSaveContext({
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 0,
          requestRefID: "req_a",
        })
      ).toBeNull()
    })

    it("does not match an identity-less tab when the lookup names its request", () => {
      const service = makeService()

      openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      expect(
        service.getTabRefWithSaveContext({
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 1,
          requestRefID: "req_a",
        })
      ).toBeNull()
    })

    it("identifies a tab without a context ref by the request it holds", () => {
      const service = makeService()

      // Context predates ref ids, but the held request names itself — found
      // even though its index has drifted
      const tab = openRequestTab(
        service,
        {
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 5,
        },
        { _ref_id: "req_a" }
      )

      const found = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "req_a",
      })

      expect(found?.value.id).toEqual(tab.id)
    })

    it("identifies a legacy tab by the backend id its request holds", () => {
      const service = makeService()

      const tab = openRequestTab(
        service,
        {
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 3,
        },
        { id: "backend_1" }
      )

      const found = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "backend_1",
      })

      expect(found?.value.id).toEqual(tab.id)
    })

    it("rejects a stale tab holding a different request at reused coordinates", () => {
      const service = makeService()

      openRequestTab(
        service,
        {
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 1,
        },
        { _ref_id: "req_other" }
      )

      expect(
        service.getTabRefWithSaveContext({
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 1,
          requestRefID: "req_a",
        })
      ).toBeNull()
    })

    it("falls back to position when the lookup has no requestRefID but the tab does", () => {
      const service = makeService()

      const tab = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "req_a",
      })

      const found = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      expect(found?.value.id).toEqual(tab.id)
    })

    it("treats an empty-string requestRefID as missing on both sides", () => {
      const service = makeService()

      // Some creation paths store "" when a request has neither `_ref_id` nor `id`
      const tab = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "",
      })

      const found = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "",
      })

      expect(found?.value.id).toEqual(tab.id)
    })

    it("scopes example lookups by exampleID", () => {
      const service = makeService()

      const requestTab = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      const exampleTab = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        exampleID: "0",
      })

      const foundRequest = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
      })

      const foundExample = service.getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        exampleID: "0",
      })

      expect(foundRequest?.value.id).toEqual(requestTab.id)
      expect(foundExample?.value.id).toEqual(exampleTab.id)
    })

    it("matches team tabs by requestID and exampleID", () => {
      const service = makeService()

      const tab = openRequestTab(service, {
        originLocation: "team-collection",
        requestID: "team_req_1",
      })

      const found = service.getTabRefWithSaveContext({
        originLocation: "team-collection",
        requestID: "team_req_1",
      })

      expect(found?.value.id).toEqual(tab.id)

      expect(
        service.getTabRefWithSaveContext({
          originLocation: "team-collection",
          requestID: "team_req_1",
          exampleID: "0",
        })
      ).toBeNull()
    })
  })

  describe("getTabsRefWithSaveContext", () => {
    it("returns every tab matching the save context", () => {
      const service = makeService()

      const first = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "req_a",
      })

      // A duplicate of the same request whose index has drifted
      const second = openRequestTab(service, {
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 0,
        requestRefID: "req_a",
      })

      const found = service.getTabsRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: "0",
        requestIndex: 1,
        requestRefID: "req_a",
      })

      expect(found.map((tab) => tab.value.id)).toEqual([first.id, second.id])
    })

    it("returns an empty array when nothing matches", () => {
      const service = makeService()

      expect(
        service.getTabsRefWithSaveContext({
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 0,
        })
      ).toEqual([])
    })
  })
})
