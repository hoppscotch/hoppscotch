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
import {
  def,
  setupUserRequestCreatedSubscription,
  setupUserRequestUpdatedSubscription,
} from "../index"
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
    let updates: Subject<any>
    let events: Subject<any>
    let persistence: Subscription | undefined
    afterEach(() => {
      syncEnabled = false
      persistence?.unsubscribe()
      events.complete()
      updates.complete()
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
      updates = new Subject()
      vi.mocked(api.runUserRequestUpdatedSubscription).mockReturnValue([
        updates,
        { unsubscribe: () => updates.complete() },
      ] as any)
      setupUserRequestUpdatedSubscription()
    })

    it.each([
      { subscriptionFirst: true, createFails: false },
      { subscriptionFirst: false, createFails: false },
      { subscriptionFirst: true, createFails: true },
      { subscriptionFirst: false, createFails: true },
    ])(
      "shares creation across saves: subscription first=$subscriptionFirst, response fails=$createFails",
      async ({ subscriptionFirst, createFails }) => {
        let persisted = ""
        persistence = store.subject$.subscribe(({ state }) => {
          persisted = JSON.stringify(state)
        })
        const responses: Array<(value: any) => void> = []
        vi.mocked(create).mockImplementation(
          () => new Promise((resolve) => responses.push(resolve)) as any
        )
        const update =
          type === "REST" ? api.editUserRequest : api.editGQLUserRequest
        vi.mocked(update).mockResolvedValue(E.right({}) as any)
        const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
        syncEnabled = true
        const request = makeRequest()
        save("0", request as any)
        await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
        const wire = vi.mocked(create).mock.calls[0][1]
        edit("0", 0, { ...request, name: "Second save" } as any)
        await new Promise((resolve) => setTimeout(resolve, 0))
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
        if (subscriptionFirst) emit()
        edit("0", 0, {
          ...store.value.state[0].requests[0],
          name: "Latest save",
        } as any)
        await new Promise((resolve) => setTimeout(resolve, 0))
        responses.forEach((resolve, index) =>
          resolve(
            createFails
              ? E.left({ error: "response failed" })
              : E.right({
                  [type === "REST"
                    ? "createRESTUserRequest"
                    : "createGQLUserRequest"]: {
                    id: index === 0 ? "server" : `duplicate-${index}`,
                  },
                })
          )
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (!subscriptionFirst) emit()

        expect(create).toHaveBeenCalledTimes(1)
        expect(update).toHaveBeenCalledTimes(1)
        const [id, name, savedWire] = vi.mocked(update).mock.calls[0]
        expect(id).toBe("server")
        expect(name).toBe("Latest save")
        expect(JSON.parse(savedWire).id).toBe("server")
        updates.next(
          E.right({
            userRequestUpdated: {
              id: "server",
              collectionID: "collection",
              type,
              request: savedWire,
            },
          })
        )
        expect(JSON.parse(savedWire)).toMatchObject({
          name: "Latest save",
          _ref_id: request._ref_id,
        })
        expect(JSON.parse(persisted)[0].requests).toEqual([
          expect.objectContaining({ id: "server", name: "Latest save" }),
        ])
        vi.mocked(api.exportUserCollectionsToJSON).mockResolvedValue(
          E.right({
            exportUserCollectionsToJSON: {
              exportedCollection: JSON.stringify([
                {
                  id: "collection",
                  name: "Test",
                  folders: [],
                  requests: [{ ...JSON.parse(savedWire), id: "server" }],
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
        runDispatchWithOutSyncing(() => setCollections(JSON.parse(persisted)))
        await def.loadUserCollections!(type)
        expect(store.value.state[0].requests).toEqual([
          expect.objectContaining({ id: "server", name: "Latest save" }),
        ])
      }
    )

    it("flushes another saved edit made while the queued update is pending", async () => {
      let respond!: (value: any) => void
      vi.mocked(create).mockImplementation(
        () =>
          new Promise((resolve) => {
            respond = resolve
          }) as any
      )
      const update =
        type === "REST" ? api.editUserRequest : api.editGQLUserRequest
      const updates: Array<(value: any) => void> = []
      vi.mocked(update).mockImplementation(
        () => new Promise((resolve) => updates.push(resolve)) as any
      )
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      syncEnabled = true
      const request = makeRequest()
      save("0", request as any)
      await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
      edit("0", 0, { ...request, name: "Second save" } as any)
      await new Promise((resolve) => setTimeout(resolve, 0))
      respond(
        E.right({
          [type === "REST" ? "createRESTUserRequest" : "createGQLUserRequest"]:
            { id: "server" },
        })
      )
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
      edit("0", 0, {
        ...store.value.state[0].requests[0],
        name: "Third save",
      } as any)
      await new Promise((resolve) => setTimeout(resolve, 0))
      const beforeResponse = vi.mocked(update).mock.calls.length
      updates[0](E.right({}))
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(2))
      updates[1](E.right({}))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(beforeResponse).toBe(1)
      expect(create).toHaveBeenCalledTimes(1)
      expect(vi.mocked(update).mock.calls.map((call) => call[1])).toEqual([
        "Second save",
        "Third save",
      ])
    })

    it("sends the dispatched edit even if a local-only change replaces the row", async () => {
      const request = { ...makeRequest(), id: "server" }
      store.value.state[0].requests.push(request)
      const update =
        type === "REST" ? api.editUserRequest : api.editGQLUserRequest
      vi.mocked(update).mockResolvedValue(E.right({}) as any)
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      syncEnabled = true
      const saved = { ...request, name: "Saved edit" }
      edit("0", 0, saved as any)
      runDispatchWithOutSyncing(() =>
        edit("0", 0, { ...request, name: "Local only" } as any)
      )
      saved.name = "Unsaved tab edit"
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
      expect(vi.mocked(update).mock.calls[0][1]).toBe("Saved edit")
      expect(JSON.parse(vi.mocked(update).mock.calls[0][2]).name).toBe(
        "Saved edit"
      )
    })

    it("keeps a queued edit attached to its request after rows are reordered", async () => {
      let respond!: (value: any) => void
      vi.mocked(create).mockImplementation(
        () =>
          new Promise((resolve) => {
            respond = resolve
          }) as any
      )
      const update =
        type === "REST" ? api.editUserRequest : api.editGQLUserRequest
      vi.mocked(update).mockResolvedValue(E.right({}) as any)
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      syncEnabled = true
      const request = makeRequest()
      save("0", request as any)
      await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
      store.value.state[0].requests.push({ ...makeRequest(), id: "other" })
      edit("0", 0, { ...request, name: "Saved edit" } as any)
      store.value.state[0].requests.reverse()
      await new Promise((resolve) => setTimeout(resolve, 0))
      respond(
        E.right({
          [type === "REST" ? "createRESTUserRequest" : "createGQLUserRequest"]:
            { id: "server" },
        })
      )
      await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1))
      expect(vi.mocked(update).mock.calls[0].slice(0, 2)).toEqual([
        "server",
        "Saved edit",
      ])
      expect(create).toHaveBeenCalledTimes(1)
    })

    it("keeps separate legacy requests with empty references distinct", async () => {
      store.value.state[0].requests.push(
        { ...makeRequest(), name: "First", _ref_id: "" },
        { ...makeRequest(), name: "Second", _ref_id: "" }
      )
      const responses: Array<(value: any) => void> = []
      vi.mocked(create).mockImplementation(
        () => new Promise((resolve) => responses.push(resolve)) as any
      )
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      syncEnabled = true
      edit("0", 0, store.value.state[0].requests[0] as any)
      edit("0", 1, store.value.state[0].requests[1] as any)
      await new Promise((resolve) => setTimeout(resolve, 0))
      responses.forEach((resolve, index) =>
        resolve(
          E.right({
            [type === "REST"
              ? "createRESTUserRequest"
              : "createGQLUserRequest"]: { id: `server-${index}` },
          })
        )
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(create).toHaveBeenCalledTimes(2)
      expect(
        store.value.state[0].requests.map((request) => request.id)
      ).toEqual(["server-0", "server-1"])
    })

    it.each([true, false])(
      "keeps a legacy copy distinct from its original, synced=%s",
      async (synced) => {
        const original = {
          ...makeRequest(),
          name: "Original",
          _ref_id: "shared",
          ...(synced ? { id: "original" } : {}),
        }
        const copy = { ...makeRequest(), name: "Copy", _ref_id: "shared" }
        store.value.state[0].requests.push(original, copy)
        const responses: Array<(value: any) => void> = []
        vi.mocked(create).mockImplementation(
          () => new Promise((resolve) => responses.push(resolve)) as any
        )
        const update =
          type === "REST" ? api.editUserRequest : api.editGQLUserRequest
        vi.mocked(update).mockResolvedValue(E.right({}) as any)
        const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
        syncEnabled = true
        edit("0", 1, copy as any)
        edit("0", 0, original as any)
        await new Promise((resolve) => setTimeout(resolve, 0))
        responses.forEach((resolve, index) =>
          resolve(
            E.right({
              [type === "REST"
                ? "createRESTUserRequest"
                : "createGQLUserRequest"]: { id: `server-${index}` },
            })
          )
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(create).toHaveBeenCalledTimes(synced ? 1 : 2)
        expect(update).toHaveBeenCalledTimes(synced ? 1 : 0)
        if (synced)
          expect(vi.mocked(update).mock.calls[0].slice(0, 2)).toEqual([
            "original",
            "Original",
          ])
        expect(copy._ref_id).not.toBe(original._ref_id)
        expect(copy.id).toBe("server-0")
      }
    )

    it("allows a later save to retry a failed creation", async () => {
      let respond!: (value: any) => void
      vi.mocked(create).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            respond = resolve
          }) as any
      )
      vi.mocked(create).mockResolvedValue(
        E.right({
          [type === "REST" ? "createRESTUserRequest" : "createGQLUserRequest"]:
            { id: "retried" },
        }) as any
      )
      const update =
        type === "REST" ? api.editUserRequest : api.editGQLUserRequest
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      syncEnabled = true
      const request = makeRequest()
      save("0", request as any)
      await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
      edit("0", 0, { ...request, name: "Saved while offline" } as any)
      await new Promise((resolve) => setTimeout(resolve, 0))
      respond(E.left({ error: "offline" }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(create).toHaveBeenCalledTimes(1)
      edit("0", 0, { ...request, name: "Retry save" } as any)
      await vi.waitFor(() =>
        expect(store.value.state[0].requests[0].id).toBe("retried")
      )
      expect(create).toHaveBeenCalledTimes(2)
      expect(vi.mocked(create).mock.calls[1][0]).toBe("Retry save")
      expect(update).not.toHaveBeenCalled()
    })

    it("keeps the same reference in different collections independent", async () => {
      store.value.state.push({
        ...store.value.state[0],
        id: "other-collection",
        requests: [],
      })
      const responses: Array<(value: any) => void> = []
      vi.mocked(create).mockImplementation(
        () => new Promise((resolve) => responses.push(resolve)) as any
      )
      syncEnabled = true
      save("0", { ...makeRequest(), _ref_id: "shared" } as any)
      save("1", { ...makeRequest(), _ref_id: "shared" } as any)
      await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2))
      responses.forEach((resolve, index) =>
        resolve(
          E.right({
            [type === "REST"
              ? "createRESTUserRequest"
              : "createGQLUserRequest"]: { id: `server-${index}` },
          })
        )
      )
      await vi.waitFor(() =>
        expect(
          store.value.state.map((folder) => folder.requests[0].id)
        ).toEqual(["server-0", "server-1"])
      )
      expect(vi.mocked(create).mock.calls.map((call) => call[2])).toEqual([
        "collection",
        "other-collection",
      ])
    })

    it("creates the current stored request after the pending object is replaced", async () => {
      const request = makeRequest()
      save("0", request as any)
      vi.mocked(create).mockResolvedValue(
        E.right({
          [type === "REST" ? "createRESTUserRequest" : "createGQLUserRequest"]:
            { id: "server" },
        }) as any
      )
      const pending = sync.saveRequestAs!({ path: "0", request })
      const updated = {
        ...request,
        name: "Edited before creation",
        ...(type === "REST"
          ? { endpoint: "https://example.com/updated" }
          : { url: "https://example.com/updated" }),
      }
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      edit("0", 0, updated as any)
      await pending

      expect(create).toHaveBeenCalledTimes(1)
      const [name, wire] = vi.mocked(create).mock.calls[0]
      expect(name).toBe("Edited before creation")
      expect(JSON.parse(wire)).toMatchObject({
        name: "Edited before creation",
        _ref_id: request._ref_id,
        ...(type === "REST"
          ? { endpoint: "https://example.com/updated" }
          : { url: "https://example.com/updated" }),
      })
      expect(store.value.state[0].requests[0]).toBe(updated)
      expect(updated.id).toBe("server")
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

    it.each([false, true])(
      "keeps the open tab's identity on the next save, pending rename=%s",
      async (rename) => {
        const request = makeRequest()
        let respond!: (value: any) => void
        vi.mocked(create).mockImplementation(
          () =>
            new Promise((resolve) => {
              respond = resolve
            }) as any
        )
        const update =
          type === "REST" ? api.editUserRequest : api.editGQLUserRequest
        vi.mocked(update).mockResolvedValue(E.right({}) as any)
        const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
        syncEnabled = true
        save("0", request as any)
        await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
        if (rename) {
          edit("0", 0, { ...request, name: "Renamed" } as any)
          request.name = "Renamed"
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
        respond(
          E.right({
            [type === "REST"
              ? "createRESTUserRequest"
              : "createGQLUserRequest"]: { id: "server" },
          })
        )
        await vi.waitFor(() =>
          expect(store.value.state[0].requests[0].id).toBe("server")
        )
        await new Promise((resolve) => setTimeout(resolve, 0))

        request.name = "Saved again"
        edit("0", 0, request as any)
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(create).toHaveBeenCalledTimes(1)
        expect(update).toHaveBeenCalledTimes(rename ? 2 : 1)
        const lastUpdate = vi.mocked(update).mock.calls.at(-1)!
        expect(lastUpdate.slice(0, 2)).toEqual(["server", "Saved again"])
        expect(JSON.parse(lastUpdate[2])).toMatchObject({
          id: "server",
          name: "Saved again",
        })
        expect(request.id).toBe("server")
        expect(store.value.state[0].requests[0]).toBe(request)
      }
    )

    it.each([
      { ref: "different", id: undefined },
      { ref: undefined, id: undefined },
      { ref: "", id: undefined },
      { ref: "shared", id: "other-server" },
    ])("does not inherit a foreign ID for ref=$ref, id=$id", ({ ref, id }) => {
      store.value.state[0].requests.push({
        ...makeRequest(),
        _ref_id: "shared",
        id: "server",
      })
      const replacement = { ...makeRequest(), _ref_id: ref, id }
      const edit = type === "REST" ? editRESTRequest : editGraphqlRequest
      edit("0", 0, replacement as any)
      expect(store.value.state[0].requests[0].id).toBe(id)
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
