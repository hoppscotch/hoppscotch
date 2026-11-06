import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Subject } from "rxjs"
import * as E from "fp-ts/Either"
import { getDefaultGQLRequest, getDefaultRESTRequest } from "@hoppscotch/data"

vi.mock("./api")
vi.mock("~/platform", () => ({ platform: {} }))
vi.mock("~/services/tab/rest", () => ({
  RESTTabService: class {
    static ID = "REST_TAB_SERVICE"
  },
}))
vi.mock("~/modules/i18n", () => ({ getI18n: () => (key: string) => key }))

import * as api from "./api"
import {
  restCollectionStore,
  graphqlCollectionStore,
  saveRESTRequestAs,
  saveGraphqlRequestAs,
} from "~/newstore/collections"
import { storeSyncDefinition as restSync } from "./sync"
import { storeSyncDefinition as gqlSync } from "./gqlCollections.sync"
import { setupUserRequestCreatedSubscription } from "./index"
import { findRequestByIdentity } from "./requestIdentity"

describe.each(["REST", "GQL"] as const)(
  "%s request synchronization",
  (type) => {
    const store = type === "REST" ? restCollectionStore : graphqlCollectionStore
    const save = type === "REST" ? saveRESTRequestAs : saveGraphqlRequestAs
    const sync = type === "REST" ? restSync : gqlSync
    const create =
      type === "REST" ? api.createRESTUserRequest : api.createGQLUserRequest
    const makeRequest =
      type === "REST" ? getDefaultRESTRequest : getDefaultGQLRequest
    let events: Subject<any>
    afterEach(() => events.complete())
    beforeEach(() => {
      vi.clearAllMocks()
      store.value.state.splice(0, store.value.state.length, {
        id: "collection",
        folders: [],
        requests: [],
        name: "Test",
      } as any)
      events = new Subject()
      vi.mocked(api.runUserRequestCreatedSubscription).mockReturnValue([
        events,
        { unsubscribe: () => events.complete() },
      ] as any)
      setupUserRequestCreatedSubscription()
    })

    it.each([true, false])(
      "reconciles real handlers with subscription first=%s",
      async (subscriptionFirst) => {
        const request = makeRequest()
        delete request._ref_id
        save("0", request as any)
        let respond!: (value: any) => void
        vi.mocked(create).mockImplementation(
          () =>
            new Promise((resolve) => {
              respond = resolve
            }) as any
        )
        const pending = sync.saveRequestAs!({ path: "0", request })
        await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
        const wire = vi.mocked(create).mock.calls[0][1]
        expect(JSON.parse(wire)._ref_id).toBeTruthy()
        const emit = () =>
          events.next(
            E.right({
              userRequestCreated: {
                id: "server",
                collectionID: "collection",
                type,
                request: wire,
              },
            })
          )
        const result = E.right({
          [type === "REST" ? "createRESTUserRequest" : "createGQLUserRequest"]:
            { id: "server" },
        })
        request.name = "Edited while pending"
        if (subscriptionFirst) emit()
        respond(result)
        await pending
        expect(store.value.state[0].requests[0].id).toBe("server")
        emit()
        emit()
        expect(store.value.state[0].requests).toHaveLength(1)
        expect(store.value.state[0].requests[0]).toMatchObject({
          id: "server",
          name: "Edited while pending",
        })
      }
    )

    it("creates a copied request and reconciles overlapping saves in reverse order", async () => {
      const original = {
        ...makeRequest(),
        id: "original",
        _ref_id: "original-ref",
      }
      store.value.state[0].requests.push(original)
      const { id: _, ...copy } = original
      const other = makeRequest()
      save("0", copy as any)
      save("0", other as any)
      expect(copy._ref_id).not.toBe(original._ref_id)
      const responses: Array<(value: any) => void> = []
      vi.mocked(create).mockImplementation(
        () => new Promise((resolve) => responses.push(resolve)) as any
      )
      const first = sync.saveRequestAs!({ path: "0", request: copy })
      const second = sync.saveRequestAs!({ path: "0", request: other })
      await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2))
      for (const index of [1, 0]) {
        const id = `server-${index}`
        events.next(
          E.right({
            userRequestCreated: {
              id,
              collectionID: "collection",
              type,
              request: vi.mocked(create).mock.calls[index][1],
            },
          })
        )
        responses[index](
          E.right({
            [type === "REST"
              ? "createRESTUserRequest"
              : "createGQLUserRequest"]: { id },
          })
        )
      }
      await Promise.all([first, second])
      expect(store.value.state[0].requests.map((r) => r.id)).toEqual([
        "original",
        "server-0",
        "server-1",
      ])
    })
  }
)

it("prioritizes object and server identity over an earlier matching reference", () => {
  const original = { id: "original", _ref_id: "shared" }
  const copy = { id: "copy", _ref_id: "shared" }
  expect(findRequestByIdentity([original, copy], copy)).toBe(copy)
  expect(findRequestByIdentity([original, copy], { ...copy })).toBe(copy)
})
