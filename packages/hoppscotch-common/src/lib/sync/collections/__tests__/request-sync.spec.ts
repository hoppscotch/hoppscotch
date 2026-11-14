import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Subject, Subscription } from "rxjs"
import * as E from "fp-ts/Either"
import { getDefaultGQLRequest, getDefaultRESTRequest } from "@hoppscotch/data"

vi.mock("../api")
vi.mock("~/platform", () => ({ platform: {} }))
vi.mock("~/services/tab/rest", () => ({
  RESTTabService: class {
    static ID = "REST_TAB_SERVICE"
  },
}))
vi.mock("~/services/tab/workspace-tabs", () => ({
  WorkspaceTabsService: class {
    static ID = "WORKSPACE_TABS_SERVICE"
  },
}))
vi.mock("~/modules/i18n", () => ({ getI18n: () => (key: string) => key }))

import * as api from "../api"
import {
  restCollectionStore,
  graphqlCollectionStore,
  saveRESTRequestAs,
  saveGraphqlRequestAs,
  editRESTRequest,
  editGraphqlRequest,
  setRESTCollections,
  setGraphqlCollections,
} from "~/newstore/collections"
import { storeSyncDefinition as restSync } from "../sync"
import { storeSyncDefinition as gqlSync } from "../gqlCollections.sync"
import { def, setupUserRequestCreatedSubscription } from "../index"
import { findRequestByIdentity } from "../requestIdentity"
import { getSyncInitFunction, runDispatchWithOutSyncing } from "../.."

let syncEnabled = false
getSyncInitFunction(
  restCollectionStore,
  restSync,
  () => syncEnabled
).startStoreSync()
getSyncInitFunction(
  graphqlCollectionStore,
  gqlSync,
  () => syncEnabled
).startStoreSync()

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
    let persistence: Subscription | undefined
    afterEach(() => {
      syncEnabled = false
      persistence?.unsubscribe()
      events.complete()
    })
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
      "persists the server ID and reloads one request with subscription first=%s",
      async (subscriptionFirst) => {
        let persisted = ""
        persistence = store.subject$.subscribe(({ state }) => {
          persisted = JSON.stringify(state)
        })
        const request = makeRequest()
        let respond!: (value: any) => void
        vi.mocked(create).mockImplementation(
          () =>
            new Promise((resolve) => {
              respond = resolve
            }) as any
        )
        syncEnabled = true
        save("0", request as any)
        await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
        expect(JSON.parse(persisted)[0].requests[0].id).toBeUndefined()

        const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
        runDispatchWithOutSyncing(() =>
          edit("0", 0, { ...request, name: "Edited while pending" } as any)
        )
        const wire = vi.mocked(create).mock.calls[0][1]
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
        const resolve = () =>
          respond(
            E.right({
              [type === "REST"
                ? "createRESTUserRequest"
                : "createGQLUserRequest"]: { id: "server" },
            })
          )

        subscriptionFirst ? emit() : resolve()
        await vi.waitFor(() =>
          expect(JSON.parse(persisted)[0].requests).toEqual([
            expect.objectContaining({
              id: "server",
              name: "Edited while pending",
            }),
          ])
        )
        subscriptionFirst ? resolve() : emit()
        emit()
        await vi.waitFor(() =>
          expect(store.value.state[0].requests).toHaveLength(1)
        )
        expect(create).toHaveBeenCalledTimes(1)
        expect(api.editUserRequest).not.toHaveBeenCalled()
        expect(api.editGQLUserRequest).not.toHaveBeenCalled()

        const reloaded = JSON.parse(persisted)
        vi.mocked(api.exportUserCollectionsToJSON).mockResolvedValue(
          E.right({
            exportUserCollectionsToJSON: {
              exportedCollection: JSON.stringify([
                {
                  id: "collection",
                  name: "Test",
                  folders: [],
                  requests: [{ ...JSON.parse(wire), id: "server" }],
                  data: JSON.stringify({
                    auth: { authType: "inherit", authActive: true },
                    headers: [],
                    variables: [],
                  }),
                },
              ]),
            },
          }) as any
        )
        const setCollections =
          type === "REST" ? setRESTCollections : setGraphqlCollections
        runDispatchWithOutSyncing(() => setCollections(reloaded))
        await def.loadUserCollections!(type)
        expect(store.value.state[0].requests.map((saved) => saved.id)).toEqual([
          "server",
        ])
      }
    )

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

    it("persists the ID of a request created by another client", () => {
      let persisted = ""
      persistence = store.subject$.subscribe(({ state }) => {
        persisted = JSON.stringify(state)
      })
      syncEnabled = true
      events.next(
        E.right({
          userRequestCreated: {
            id: "remote-server",
            collectionID: "collection",
            type,
            request: JSON.stringify(makeRequest()),
          },
        })
      )
      expect(
        JSON.parse(persisted)[0].requests.map((request: any) => request.id)
      ).toEqual(["remote-server"])
      expect(create).not.toHaveBeenCalled()
    })

    it("keeps the open tab's saved request identity on the next save", async () => {
      const request = makeRequest()
      vi.mocked(create).mockResolvedValue(
        E.right({
          [type === "REST" ? "createRESTUserRequest" : "createGQLUserRequest"]:
            { id: "server" },
        }) as any
      )
      const update =
        type === "REST" ? api.editUserRequest : api.editGQLUserRequest
      vi.mocked(update).mockResolvedValue(E.right({}) as any)
      syncEnabled = true
      save("0", request as any)
      await vi.waitFor(() =>
        expect(store.value.state[0].requests[0].id).toBe("server")
      )
      expect(request.id).toBe("server")
      expect(store.value.state[0].requests[0]).toBe(request)

      request.name = "Saved again"
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      edit("0", 0, request as any)
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
      expect(vi.mocked(update).mock.calls[0][0]).toBe("server")
      expect(create).toHaveBeenCalledTimes(1)
    })

    it("gives a remote copy its own reference identity", () => {
      const original = { ...makeRequest(), id: "original", _ref_id: "shared" }
      store.value.state[0].requests.push(original)
      const { id: _, ...copy } = original
      events.next(
        E.right({
          userRequestCreated: {
            id: "copy",
            collectionID: "collection",
            type,
            request: JSON.stringify(copy),
          },
        })
      )
      const requests = store.value.state[0].requests
      expect(requests.map((request) => request.id)).toEqual([
        "original",
        "copy",
      ])
      expect(requests[1]._ref_id).toBeTruthy()
      expect(requests[1]._ref_id).not.toBe(original._ref_id)
    })

    it.each([false, true])(
      "reconciles a late response after the collection moves or is removed, removed=%s",
      async (removed) => {
        const request = makeRequest()
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
        const original = store.value.state[0]
        const other = { ...original, id: "other", requests: [makeRequest()] }
        const setCollections =
          type === "REST" ? setRESTCollections : setGraphqlCollections
        setCollections((removed ? [other] : [other, original]) as any)
        respond(
          E.right({
            [type === "REST"
              ? "createRESTUserRequest"
              : "createGQLUserRequest"]: { id: "server" },
          })
        )
        await pending
        expect(store.value.state[0].requests[0].id).toBeUndefined()
        if (removed) {
          expect(store.value.state).toHaveLength(1)
        } else {
          expect(store.value.state[1].requests[0].id).toBe("server")
        }
      }
    )

    it("creates a copied request and reconciles overlapping saves in reverse order", async () => {
      let persisted = ""
      persistence = store.subject$.subscribe(({ state }) => {
        persisted = JSON.stringify(state)
      })
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
      expect(
        JSON.parse(persisted)[0].requests.map((request: any) => request.id)
      ).toEqual(["original", "server-0", "server-1"])
    })
  }
)

it("prioritizes object and server identity over an earlier matching reference", () => {
  const original = { id: "original", _ref_id: "shared" }
  const copy = { id: "copy", _ref_id: "shared" }
  expect(findRequestByIdentity([original, copy], copy)).toBe(copy)
  expect(findRequestByIdentity([original, copy], { ...copy })).toBe(copy)
})
