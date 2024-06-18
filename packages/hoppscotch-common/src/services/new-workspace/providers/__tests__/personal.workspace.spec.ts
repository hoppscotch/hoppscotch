import { getDefaultRESTRequest } from "@hoppscotch/data"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it } from "vitest"
import { ref } from "vue"

import {
  navigateToFolderWithIndexPath,
  restCollectionStore,
} from "~/newstore/collections"
import { WritableHandleRef } from "../../handle"
import { WorkspaceCollection, WorkspaceRequest } from "../../workspace"
import { PersonalWorkspaceProviderService } from "../personal.workspace"
import {
  MOVE_REST_COLLECTION_STORE_MOCK,
  MOVE_REST_REQUEST_STORE_MOCK,
  REMOVE_REST_COLLECTION_STORE_MOCK,
  REMOVE_REST_REQUEST_STORE_MOCK,
  REORDER_REST_REQUEST_STORE_MOCK,
} from "./__mocks__/store"
import { generateIssuedHandleValues, getWritableHandle } from "./helpers"

describe("PersonalWorkspaceProviderService", () => {
  const container = new TestContainer()

  const personalWorkspaceProviderService = container.bind(
    PersonalWorkspaceProviderService
  )

  const workspaceHandle =
    personalWorkspaceProviderService.getPersonalWorkspaceHandle()

  describe("moveRESTRequest", () => {
    it("Returns a `Left` value `INVALID_REQUEST_HANDLE` on supplying an invalid request handle", async () => {
      // Simulating an invalid request handle
      const requestHandle = {
        get: () =>
          ref({
            type: "invalid" as const,
            reason: "INVALID_WORKSPACE_HANDLE",
          }),
      }

      const destinationCollectionID = "1"
      const moveRequestResult =
        await personalWorkspaceProviderService.moveRESTRequest(
          requestHandle,
          destinationCollectionID
        )

      expect(moveRequestResult).toEqual(
        E.left("INVALID_REQUEST_HANDLE" as const)
      )
    })

    it("Successfully updates the store and issued handles for affected requests while moving a top-level REST request between collections", async () => {
      restCollectionStore.subject$.next({
        state: MOVE_REST_REQUEST_STORE_MOCK.TOP_LEVEL_COLLECTIONS,
      })

      const issuedHandleValues = generateIssuedHandleValues([
        { collectionID: "1", requestCount: 6 },
        { collectionID: "3", requestCount: 3 },
      ])

      personalWorkspaceProviderService.issuedHandles =
        issuedHandleValues.map(getWritableHandle)

      // Request (req-1/2) moved from `1/2` to `3/3`
      // It will appear towards the end in the destination collection
      const draggedRequestID = "1/2"
      const destinationCollectionID = "3"

      const workspaceHandle =
        personalWorkspaceProviderService.getPersonalWorkspaceHandle()

      const draggedRequestHandle =
        await personalWorkspaceProviderService.getRESTRequestHandle(
          workspaceHandle,
          draggedRequestID
        )

      if (E.isLeft(draggedRequestHandle)) {
        throw new Error(draggedRequestHandle.left?.toString())
      }

      await personalWorkspaceProviderService.moveRESTRequest(
        draggedRequestHandle.right,
        destinationCollectionID
      )

      const expectedIssuedHandlesDataArr = [
        { requestID: "1/0", requestName: "req-1/0" },
        { requestID: "1/1", requestName: "req-1/1" },

        // Request (req-1/2) moved from `1/2` to `3/3`
        { requestID: "3/3", requestName: "req-1/2" },

        // Index positions of the requests appearing below the dragged request gets decreased by `1`
        { requestID: "1/2", requestName: "req-1/3" },
        { requestID: "1/3", requestName: "req-1/4" },
        { requestID: "1/4", requestName: "req-1/5" },

        // Requests from the destination collection
        { requestID: "3/0", requestName: "req-3/0" },
        { requestID: "3/1", requestName: "req-3/1" },
        { requestID: "3/2", requestName: "req-3/2" },
      ]

      const updatedIssuedHandlesDataArr: {
        requestID: string
        requestName: string
      }[] = []

      personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
        if (handle.value.type === "ok" && "requestID" in handle.value.data) {
          const { requestID, request } = handle.value.data

          const { name: requestName } = request

          updatedIssuedHandlesDataArr.push({
            requestID,
            requestName,
          })
        }
      })

      expect(updatedIssuedHandlesDataArr).toEqual(expectedIssuedHandlesDataArr)
    })

    it("Successfully updates the store and issued handles for affected requests while moving a REST request between deeply nested collections", async () => {
      restCollectionStore.subject$.next({
        state: MOVE_REST_REQUEST_STORE_MOCK.DEEPLY_NESTED_COLLECTIONS,
      })

      const issuedHandleValues = generateIssuedHandleValues([
        { collectionID: "0/0/0/0/0", requestCount: 4 },
        { collectionID: "1/0/0/0", requestCount: 2 },
      ])

      personalWorkspaceProviderService.issuedHandles =
        issuedHandleValues.map(getWritableHandle)

      // Request (req-0/0/0/0/0/1) moved from `0/0/0/0/0/1` to `1/0/0/0/2`
      // It will appear towards the end in the destination collection
      const draggedRequestID = "0/0/0/0/0/1"
      const destinationCollectionID = "1/0/0/0"

      const draggedRequestHandle =
        await personalWorkspaceProviderService.getRESTRequestHandle(
          workspaceHandle,
          draggedRequestID
        )

      if (E.isLeft(draggedRequestHandle)) {
        throw new Error(draggedRequestHandle.left?.toString())
      }

      await personalWorkspaceProviderService.moveRESTRequest(
        draggedRequestHandle.right,
        destinationCollectionID
      )

      const expectedIssuedHandlesDataArr = [
        {
          requestID: "0/0/0/0/0/0",
          requestName: "req-0/0/0/0/0/0",
        },

        // Request (req-0/0/0/0/0/1) moved from `0/0/0/0/0/1` to `1/0/0/0/2`
        {
          requestID: "1/0/0/0/2",
          requestName: "req-0/0/0/0/0/1",
        },

        // Index positions of the requests appearing below the dragged request gets decreased by `1`
        {
          requestID: "0/0/0/0/0/1",
          requestName: "req-0/0/0/0/0/2",
        },
        {
          requestID: "0/0/0/0/0/2",
          requestName: "req-0/0/0/0/0/3",
        },

        // Requests from the destination collection
        {
          requestID: "1/0/0/0/0",
          requestName: "req-1/0/0/0/0",
        },
        {
          requestID: "1/0/0/0/1",
          requestName: "req-1/0/0/0/1",
        },
      ]

      const updatedIssuedHandlesDataArr: {
        requestID: string
        requestName: string
      }[] = []

      personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
        if (handle.value.type === "ok" && "requestID" in handle.value.data) {
          const { requestID, request } = handle.value.data

          const { name: requestName } = request

          updatedIssuedHandlesDataArr.push({
            requestID,
            requestName,
          })
        }
      })

      expect(updatedIssuedHandlesDataArr).toEqual(expectedIssuedHandlesDataArr)
    })
  })

  describe("reorderRESTRequest", () => {
    it("Returns a `Left` value `INVALID_REQUEST_HANDLE` on supplying an invalid request handle", async () => {
      // Simulating an invalid request handle
      const requestHandle = {
        get: () =>
          ref({
            type: "invalid" as const,
            reason: "INVALID_WORKSPACE_HANDLE",
          }),
      }

      const destinationRequestID = "1/1"

      const moveRequestResult =
        await personalWorkspaceProviderService.reorderRESTRequest(
          requestHandle,
          destinationRequestID
        )

      expect(moveRequestResult).toEqual(
        E.left("INVALID_REQUEST_HANDLE" as const)
      )
    })

    describe("Reordering a REST request to the destination above it", () => {
      let issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      beforeEach(() => {
        restCollectionStore.subject$.next({
          state: REORDER_REST_REQUEST_STORE_MOCK.DESTINATION_ABOVE,
        })

        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID: "0/0/0", requestCount: 10 },
        ])

        issuedHandles = issuedHandleValues.map(getWritableHandle)
      })

      it("Successfully updates the store and issued handles for affected requests while reordering a REST request to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/7) dragged from `0/0/0/7` to `0/0/0/2`
        const draggedRequestID = "0/0/0/7"

        const destinationRequestID = "0/0/0/2"

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRESTRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationRequestID
        )

        const expectedIssuedHandlesDataArr = [
          { requestID: "0/0/0/0", requestName: "req-0/0/0/0" },
          { requestID: "0/0/0/1", requestName: "req-0/0/0/1" },

          // Index positions for requests appearing below the destination index position gets increased by `1`
          { requestID: "0/0/0/3", requestName: "req-0/0/0/2" },
          { requestID: "0/0/0/4", requestName: "req-0/0/0/3" },
          { requestID: "0/0/0/5", requestName: "req-0/0/0/4" },
          { requestID: "0/0/0/6", requestName: "req-0/0/0/5" },
          { requestID: "0/0/0/7", requestName: "req-0/0/0/6" },

          // Request dragged from `0/0/0/7` to `0/0/0/2`
          { requestID: "0/0/0/2", requestName: "req-0/0/0/7" },

          // IDs for requests appearing below the dragged request stays the same
          { requestID: "0/0/0/8", requestName: "req-0/0/0/8" },
          { requestID: "0/0/0/9", requestName: "req-0/0/0/9" },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { requestID, request } = handle.value.data

            const { name: requestName } = request

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })

      it("Successfully updates the store and issued handles for affected requests while reordering a REST request to the first position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/5) dragged from `0/0/0/5` to `0/0/0/0`
        const draggedRequestID = "0/0/0/5"

        const destinationRequestID = "0/0/0/0"

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRESTRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationRequestID
        )

        const expectedIssuedHandlesDataArr = [
          // Index positions for requests appearing below the destination `0/0/0/0` gets increased by `1`
          { requestID: "0/0/0/1", requestName: "req-0/0/0/0" },
          { requestID: "0/0/0/2", requestName: "req-0/0/0/1" },
          { requestID: "0/0/0/3", requestName: "req-0/0/0/2" },
          { requestID: "0/0/0/4", requestName: "req-0/0/0/3" },
          { requestID: "0/0/0/5", requestName: "req-0/0/0/4" },

          // Request dragged from `0/0/0/5` to `0/0/0/0`
          { requestID: "0/0/0/0", requestName: "req-0/0/0/5" },

          // IDs for requests appearing below the dragged request stays the same
          { requestID: "0/0/0/6", requestName: "req-0/0/0/6" },
          { requestID: "0/0/0/7", requestName: "req-0/0/0/7" },
          { requestID: "0/0/0/8", requestName: "req-0/0/0/8" },
          { requestID: "0/0/0/9", requestName: "req-0/0/0/9" },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { requestID, request } = handle.value.data

            const { name: requestName } = request

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })
    })

    describe("Reordering a REST request to the destination below it", () => {
      let issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      beforeEach(() => {
        restCollectionStore.subject$.next({
          state: REORDER_REST_REQUEST_STORE_MOCK.DESTINATION_BELOW,
        })

        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID: "0/0/0", requestCount: 10 },
        ])

        issuedHandles = issuedHandleValues.map(getWritableHandle)
      })

      it("Successfully updates the store and issued handles for affected requests while reordering a REST request to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/3) dragged from `0/0/0/3` to `0/0/0/8`
        const draggedRequestID = "0/0/0/3"

        const destinationRequestID = "0/0/0/8"

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRESTRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationRequestID
        )

        const expectedIssuedHandlesDataArr = [
          { requestID: "0/0/0/0", requestName: "req-0/0/0/0" },
          { requestID: "0/0/0/1", requestName: "req-0/0/0/1" },
          { requestID: "0/0/0/2", requestName: "req-0/0/0/2" },

          // Request dragged from `0/0/0/3` to `0/0/0/8`
          // The destination request index position will be decreased by `1` to account for the dragged request, hence `0/0/0/8` -> `0/0/0/7`
          { requestID: "0/0/0/7", requestName: "req-0/0/0/3" },

          // Index positions for requests appearing below the dragged request gets decreased by `1`
          { requestID: "0/0/0/3", requestName: "req-0/0/0/4" },
          { requestID: "0/0/0/4", requestName: "req-0/0/0/5" },
          { requestID: "0/0/0/5", requestName: "req-0/0/0/6" },
          { requestID: "0/0/0/6", requestName: "req-0/0/0/7" },

          // IDs for requests appearing below the destination stays the same
          { requestID: "0/0/0/8", requestName: "req-0/0/0/8" },
          { requestID: "0/0/0/9", requestName: "req-0/0/0/9" },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { requestID, request } = handle.value.data

            const { name: requestName } = request

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })

      it("Successfully updates the store and issued handles for affected requests while reordering a REST request to the last position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/5) dragged from `0/0/0/5` to `0/0/0/9`
        const draggedRequestID = "0/0/0/5"

        // Indicates move to the last position `0/0/0/9`
        const destinationRequestID = null

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRESTRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationRequestID
        )

        const expectedIssuedHandlesDataArr = [
          // IDs for requests appearing above the dragged request stays the same
          { requestID: "0/0/0/0", requestName: "req-0/0/0/0" },
          { requestID: "0/0/0/1", requestName: "req-0/0/0/1" },
          { requestID: "0/0/0/2", requestName: "req-0/0/0/2" },
          { requestID: "0/0/0/3", requestName: "req-0/0/0/3" },
          { requestID: "0/0/0/4", requestName: "req-0/0/0/4" },

          // Request dragged from `0/0/0/5` to `0/0/0/9`
          { requestID: "0/0/0/9", requestName: "req-0/0/0/5" },

          // Index positions for requests appearing below the dragged request gets decreased by `1`
          { requestID: "0/0/0/5", requestName: "req-0/0/0/6" },
          { requestID: "0/0/0/6", requestName: "req-0/0/0/7" },
          { requestID: "0/0/0/7", requestName: "req-0/0/0/8" },
          { requestID: "0/0/0/8", requestName: "req-0/0/0/9" },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { requestID, request } = handle.value.data

            const { name: requestName } = request

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })
    })
  })

  describe("reorderRESTCollection", () => {
    it("Returns a `Left` value `INVALID_COLLECTION_HANDLE` on supplying an invalid collection handle", async () => {
      // Simulating an invalid request handle due
      const collectiontHandle = {
        get: () =>
          ref({
            type: "invalid" as const,
            reason: "INVALID_WORKSPACE_HANDLE",
          }),
      }

      const destinationCollectionID = "1"
      const moveRequestResult =
        await personalWorkspaceProviderService.reorderRESTCollection(
          collectiontHandle,
          destinationCollectionID
        )

      expect(moveRequestResult).toEqual(
        E.left("INVALID_COLLECTION_HANDLE" as const)
      )
    })

    describe("Reordering a REST collection to the destination above it", () => {
      let issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      beforeEach(() => {
        // Reset b/w test cases
        if (issuedHandles.length > 0) {
          issuedHandles = []
        }

        // TODO: Investigate why `REORDER_REST_COLLECTION.DESTINATION_ABOVE` can't be used here
        restCollectionStore.subject$.next({
          state: [
            {
              v: 2,
              name: "coll-0",
              id: "clw90c6wo008juuv7pmxbldtg",
              folders: [
                {
                  v: 2,
                  name: "coll-0/0",
                  id: "clw90c6wo008juuv7pmxbldtg",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/0/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/0/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/0/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: false,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/1",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/1/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/1/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/1/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/2",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/2/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/2/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/2/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/3",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/3/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/3/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/3/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/4",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/4/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/4/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/4/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
              ],
              requests: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
              headers: [],
            },
          ],
        })

        const collectionIDs = [
          "0/0",
          "0/0/0",
          "0/1",
          "0/1/0",
          "0/2",
          "0/2/0",
          "0/3",
          "0/3/0",
          "0/4",
          "0/4/0",
        ]

        collectionIDs.forEach((collectionID) => {
          const issuedHandleValues = generateIssuedHandleValues([
            { collectionID, requestCount: 2 },
          ])

          issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
        })
      })

      it("Successfully updates the store and issued handles for requests under affected collections while reordering a REST collection to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/3) dragged from `0/3` to `0/1`
        const draggedCollectionID = "0/3"
        const destinationCollectionID = "0/1"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getRESTCollectionHandle(
            workspaceHandle,
            draggedCollectionID
          )

        if (E.isLeft(draggedCollectionHandle)) {
          throw new Error(draggedCollectionHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTCollection(
          draggedCollectionHandle.right,
          destinationCollectionID
        )

        const expectedIssuedHandlesDataArr = [
          // ID of the collection at the top (`coll-0/0`) of the destination remains the same
          {
            requestID: "0/0/0",
            requestName: "req-0/0/0",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/0/1",
            requestName: "req-0/0/1",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/0/0/0",
            requestName: "req-0/0/0/0",
            collectionName: "coll-0/0/0",
          },
          {
            requestID: "0/0/0/1",
            requestName: "req-0/0/0/1",
            collectionName: "coll-0/0/0",
          },

          // Index position of the collections below (`coll-0/1` - `coll-0/2`) the destination gets increased by `1`
          {
            requestID: "0/2/0",
            requestName: "req-0/1/0",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/2/1",
            requestName: "req-0/1/1",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/2/0/0",
            requestName: "req-0/1/0/0",
            collectionName: "coll-0/1/0",
          },
          {
            requestID: "0/2/0/1",
            requestName: "req-0/1/0/1",
            collectionName: "coll-0/1/0",
          },
          {
            requestID: "0/3/0",
            requestName: "req-0/2/0",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/3/1",
            requestName: "req-0/2/1",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/3/0/0",
            requestName: "req-0/2/0/0",
            collectionName: "coll-0/2/0",
          },
          {
            requestID: "0/3/0/1",
            requestName: "req-0/2/0/1",
            collectionName: "coll-0/2/0",
          },

          // Collection (`coll-0/3`) dragged from `0/3` to `0/1`
          {
            requestID: "0/1/0",
            requestName: "req-0/3/0",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/1/1",
            requestName: "req-0/3/1",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/1/0/0",
            requestName: "req-0/3/0/0",
            collectionName: "coll-0/3/0",
          },
          {
            requestID: "0/1/0/1",
            requestName: "req-0/3/0/1",
            collectionName: "coll-0/3/0",
          },

          // ID of the collection (`coll-0/4`) below the dragged collection (`coll-0/3`) remains the same
          {
            requestID: "0/4/0",
            requestName: "req-0/4/0",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/4/1",
            requestName: "req-0/4/1",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/4/0/0",
            requestName: "req-0/4/0/0",
            collectionName: "coll-0/4/0",
          },
          {
            requestID: "0/4/0/1",
            requestName: "req-0/4/0/1",
            collectionName: "coll-0/4/0",
          },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
          collectionName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { collectionID, requestID, request } = handle.value.data

            const { name: requestName } = request

            const collectionName = navigateToFolderWithIndexPath(
              personalWorkspaceProviderService.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )!.name

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
              collectionName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })

      it("Successfully updates the store and issued handles for requests under affected collections while reordering a REST collection to the first position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/2) dragged from `0/2` to `0/0`
        const draggedCollectionID = "0/2"
        const destinationCollectionID = "0/0"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getRESTCollectionHandle(
            workspaceHandle,
            draggedCollectionID
          )

        if (E.isLeft(draggedCollectionHandle)) {
          throw new Error(draggedCollectionHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTCollection(
          draggedCollectionHandle.right,
          destinationCollectionID
        )

        const expectedIssuedHandlesDataArr = [
          // Index position of the collections below (`coll-0/0` - `coll-0/1`) the destination gets increased by `1`
          {
            requestID: "0/1/0",
            requestName: "req-0/0/0",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/1/1",
            requestName: "req-0/0/1",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/1/0/0",
            requestName: "req-0/0/0/0",
            collectionName: "coll-0/0/0",
          },
          {
            requestID: "0/1/0/1",
            requestName: "req-0/0/0/1",
            collectionName: "coll-0/0/0",
          },

          {
            requestID: "0/2/0",
            requestName: "req-0/1/0",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/2/1",
            requestName: "req-0/1/1",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/2/0/0",
            requestName: "req-0/1/0/0",
            collectionName: "coll-0/1/0",
          },
          {
            requestID: "0/2/0/1",
            requestName: "req-0/1/0/1",
            collectionName: "coll-0/1/0",
          },

          // Collection (`coll-0/2`) dragged from `0/2` to `0/0`
          {
            requestID: "0/0/0",
            requestName: "req-0/2/0",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/0/1",
            requestName: "req-0/2/1",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/0/0/0",
            requestName: "req-0/2/0/0",
            collectionName: "coll-0/2/0",
          },
          {
            requestID: "0/0/0/1",
            requestName: "req-0/2/0/1",
            collectionName: "coll-0/2/0",
          },

          // ID of the collections (`coll-0/3` - `coll-0/4`) below the dragged collection (`coll-0/2`) remains the same
          {
            requestID: "0/3/0",
            requestName: "req-0/3/0",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/3/1",
            requestName: "req-0/3/1",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/3/0/0",
            requestName: "req-0/3/0/0",
            collectionName: "coll-0/3/0",
          },
          {
            requestID: "0/3/0/1",
            requestName: "req-0/3/0/1",
            collectionName: "coll-0/3/0",
          },

          {
            requestID: "0/4/0",
            requestName: "req-0/4/0",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/4/1",
            requestName: "req-0/4/1",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/4/0/0",
            requestName: "req-0/4/0/0",
            collectionName: "coll-0/4/0",
          },
          {
            requestID: "0/4/0/1",
            requestName: "req-0/4/0/1",
            collectionName: "coll-0/4/0",
          },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
          collectionName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { collectionID, requestID, request } = handle.value.data

            const { name: requestName } = request

            const collectionName = navigateToFolderWithIndexPath(
              personalWorkspaceProviderService.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )!.name

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
              collectionName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })
    })

    describe("Reordering a REST collection to the destination below it", () => {
      let issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      beforeEach(() => {
        // Reset b/w test cases
        if (issuedHandles.length > 0) {
          issuedHandles = []
        }

        // TODO: Investigate why `REORDER_REST_COLLECTION.DESTINATION_BELOW` can't be used here
        restCollectionStore.subject$.next({
          state: [
            {
              v: 2,
              name: "coll-0",
              id: "clw90c6wo008juuv7pmxbldtg",
              folders: [
                {
                  v: 2,
                  name: "coll-0/0",
                  id: "clw90c6wo008juuv7pmxbldtg",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/0/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/0/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/0/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: false,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/1",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/1/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/1/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/1/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/2",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/2/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/2/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/2/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/3",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/3/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/3/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/3/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
                {
                  v: 2,
                  name: "coll-0/4",
                  folders: [
                    {
                      v: 2,
                      name: "coll-0/4/0",
                      folders: [],
                      requests: Array.from({ length: 2 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/4/0/${idx}`,
                      })),
                      auth: {
                        authType: "inherit",
                        authActive: true,
                      },
                      headers: [],
                    },
                  ],
                  requests: Array.from({ length: 2 }, (_, idx) => ({
                    ...getDefaultRESTRequest(),
                    name: `req-0/4/${idx}`,
                  })),
                  auth: {
                    authType: "inherit",
                    authActive: true,
                  },
                  headers: [],
                },
              ],
              requests: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
              headers: [],
            },
          ],
        })

        const collectionIDs = [
          "0/0",
          "0/0/0",
          "0/1",
          "0/1/0",
          "0/2",
          "0/2/0",
          "0/3",
          "0/3/0",
          "0/4",
          "0/4/0",
        ]

        collectionIDs.forEach((collectionID) => {
          const issuedHandleValues = generateIssuedHandleValues([
            { collectionID, requestCount: 2 },
          ])

          issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
        })
      })

      it("Successfully updates the store and issued handles for requests under affected collections while reordering a REST collection to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/0) dragged from `0/0` to `0/2`
        const draggedCollectionID = "0/0"
        const destinationCollectionID = "0/2"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getRESTCollectionHandle(
            workspaceHandle,
            draggedCollectionID
          )

        if (E.isLeft(draggedCollectionHandle)) {
          throw new Error(draggedCollectionHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTCollection(
          draggedCollectionHandle.right,
          destinationCollectionID
        )

        const expectedIssuedHandlesDataArr = [
          // Collection (`coll-0/0`) dragged from `0/0` to `0/2`
          // The destination collection index position will be decreased by `1` to account for the dragged request, hence `0/2` -> `0/1`
          {
            requestID: "0/1/0",
            requestName: "req-0/0/0",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/1/1",
            requestName: "req-0/0/1",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/1/0/0",
            requestName: "req-0/0/0/0",
            collectionName: "coll-0/0/0",
          },
          {
            requestID: "0/1/0/1",
            requestName: "req-0/0/0/1",
            collectionName: "coll-0/0/0",
          },

          // Index position of the collection below (`coll-0/1`) the dragged collection (`coll-0/0`) gets decreased by `1`
          {
            requestID: "0/0/0",
            requestName: "req-0/1/0",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/0/1",
            requestName: "req-0/1/1",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/0/0/0",
            requestName: "req-0/1/0/0",
            collectionName: "coll-0/1/0",
          },
          {
            requestID: "0/0/0/1",
            requestName: "req-0/1/0/1",
            collectionName: "coll-0/1/0",
          },

          // ID of the collections (`coll-0/2` - `coll-0/4`) below the destination (`coll-0/2`) remains the same
          {
            requestID: "0/2/0",
            requestName: "req-0/2/0",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/2/1",
            requestName: "req-0/2/1",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/2/0/0",
            requestName: "req-0/2/0/0",
            collectionName: "coll-0/2/0",
          },
          {
            requestID: "0/2/0/1",
            requestName: "req-0/2/0/1",
            collectionName: "coll-0/2/0",
          },

          {
            requestID: "0/3/0",
            requestName: "req-0/3/0",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/3/1",
            requestName: "req-0/3/1",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/3/0/0",
            requestName: "req-0/3/0/0",
            collectionName: "coll-0/3/0",
          },
          {
            requestID: "0/3/0/1",
            requestName: "req-0/3/0/1",
            collectionName: "coll-0/3/0",
          },

          {
            requestID: "0/4/0",
            requestName: "req-0/4/0",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/4/1",
            requestName: "req-0/4/1",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/4/0/0",
            requestName: "req-0/4/0/0",
            collectionName: "coll-0/4/0",
          },
          {
            requestID: "0/4/0/1",
            requestName: "req-0/4/0/1",
            collectionName: "coll-0/4/0",
          },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
          collectionName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { collectionID, requestID, request } = handle.value.data

            const { name: requestName } = request

            const collectionName = navigateToFolderWithIndexPath(
              personalWorkspaceProviderService.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )!.name

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
              collectionName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })

      it("Successfully updates the store and issued handles for requests under affected collections while reordering a REST collection to the last position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/1) dragged from `0/1` to `0/4` (final resolved destination ID after reorder)
        const draggedCollectionID = "0/1"
        // Indicates move to the last position
        const destinationCollectionID = null

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getRESTCollectionHandle(
            workspaceHandle,
            draggedCollectionID
          )

        if (E.isLeft(draggedCollectionHandle)) {
          throw new Error(draggedCollectionHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTCollection(
          draggedCollectionHandle.right,
          destinationCollectionID
        )

        const expectedIssuedHandlesDataArr = [
          // ID of the collection at the top (`coll-0/0`) of the dragged collection (`coll-0/1`) remains the same
          {
            requestID: "0/0/0",
            requestName: "req-0/0/0",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/0/1",
            requestName: "req-0/0/1",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/0/0/0",
            requestName: "req-0/0/0/0",
            collectionName: "coll-0/0/0",
          },
          {
            requestID: "0/0/0/1",
            requestName: "req-0/0/0/1",
            collectionName: "coll-0/0/0",
          },

          // Collection (`coll-0/1`) dragged from `0/1` to `0/4` (final resolved destination ID after reorder)
          {
            requestID: "0/4/0",
            requestName: "req-0/1/0",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/4/1",
            requestName: "req-0/1/1",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/4/0/0",
            requestName: "req-0/1/0/0",
            collectionName: "coll-0/1/0",
          },
          {
            requestID: "0/4/0/1",
            requestName: "req-0/1/0/1",
            collectionName: "coll-0/1/0",
          },

          // Index positions of the collections (`coll-0/2` - `coll-0/4`) b/w the dragged collection (`coll-0/1`) & destination (0/4) gets decreased by `1`
          {
            requestID: "0/1/0",
            requestName: "req-0/2/0",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/1/1",
            requestName: "req-0/2/1",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/1/0/0",
            requestName: "req-0/2/0/0",
            collectionName: "coll-0/2/0",
          },
          {
            requestID: "0/1/0/1",
            requestName: "req-0/2/0/1",
            collectionName: "coll-0/2/0",
          },

          {
            requestID: "0/2/0",
            requestName: "req-0/3/0",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/2/1",
            requestName: "req-0/3/1",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/2/0/0",
            requestName: "req-0/3/0/0",
            collectionName: "coll-0/3/0",
          },
          {
            requestID: "0/2/0/1",
            requestName: "req-0/3/0/1",
            collectionName: "coll-0/3/0",
          },

          {
            requestID: "0/3/0",
            requestName: "req-0/4/0",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/3/1",
            requestName: "req-0/4/1",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/3/0/0",
            requestName: "req-0/4/0/0",
            collectionName: "coll-0/4/0",
          },
          {
            requestID: "0/3/0/1",
            requestName: "req-0/4/0/1",
            collectionName: "coll-0/4/0",
          },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
          collectionName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { collectionID, requestID, request } = handle.value.data

            const { name: requestName } = request

            const collectionName = navigateToFolderWithIndexPath(
              personalWorkspaceProviderService.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )!.name

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
              collectionName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })
    })
  })

  describe("moveRESTCollection", () => {
    it("Returns a `Left` value `INVALID_COLLECTION_HANDLE` on supplying an invalid collection handle", async () => {
      // Simulating an invalid collection handle due
      const collectiontHandle = {
        get: () =>
          ref({
            type: "invalid" as const,
            reason: "INVALID_WORKSPACE_HANDLE",
          }),
      }

      const destinationCollectionID = "1"
      const moveRequestResult =
        await personalWorkspaceProviderService.reorderRESTCollection(
          collectiontHandle,
          destinationCollectionID
        )

      expect(moveRequestResult).toEqual(
        E.left("INVALID_COLLECTION_HANDLE" as const)
      )
    })

    it("Successfully updates the store and issued handles for requests under affected collections while moving a REST collection to be one among the root nodes", async () => {
      restCollectionStore.subject$.next({
        state: MOVE_REST_COLLECTION_STORE_MOCK.DESTINATION_ROOT,
      })

      const collectionIDs = ["1/0", "1/0/0", "1/1", "1/1/0", "1/2", "1/2/0"]

      const issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      collectionIDs.forEach((collectionID) => {
        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID, requestCount: 1 },
        ])

        issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
      })

      personalWorkspaceProviderService.issuedHandles = issuedHandles

      const draggedCollectionID = "1/1"
      const destinationCollectionID = null

      const draggedCollectionHandle =
        await personalWorkspaceProviderService.getRESTCollectionHandle(
          workspaceHandle,
          draggedCollectionID
        )

      if (E.isLeft(draggedCollectionHandle)) {
        throw new Error(draggedCollectionHandle.left?.toString())
      }

      await personalWorkspaceProviderService.moveRESTCollection(
        draggedCollectionHandle.right,
        destinationCollectionID
      )

      const expectedIssuedHandlesDataArr = [
        // ID of the collection (`coll-1/0`) above the dragged collection (`coll-1/1`) remains the same
        {
          requestID: "1/0/0",
          requestName: "req-1/0/0",
          collectionName: "coll-1/0",
        },
        {
          requestID: "1/0/0/0",
          requestName: "req-1/0/0/0",
          collectionName: "coll-1/0/0",
        },

        // Dragged collection (`coll-1/1`) moved to the root (`3/0`)
        {
          requestID: "3/0",
          requestName: "req-1/1/0",
          collectionName: "coll-1/1",
        },
        {
          requestID: "3/0/0",
          requestName: "req-1/1/0/0",
          collectionName: "coll-1/1/0",
        },

        // Index position of collection (`coll-1/2`) below the dragged collection (`coll-1/1`) gets decreased by `1`
        {
          requestID: "1/1/0",
          requestName: "req-1/2/0",
          collectionName: "coll-1/2",
        },
        {
          requestID: "1/1/0/0",
          requestName: "req-1/2/0/0",
          collectionName: "coll-1/2/0",
        },
      ]

      const updatedIssuedHandlesDataArr: {
        requestID: string
        requestName: string
        collectionName: string
      }[] = []

      personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
        if (handle.value.type === "ok" && "requestID" in handle.value.data) {
          const { collectionID, requestID, request } = handle.value.data

          const { name: requestName } = request

          const collectionName = navigateToFolderWithIndexPath(
            personalWorkspaceProviderService.restCollectionState.value.state,
            collectionID.split("/").map((id) => parseInt(id))
          )!.name

          updatedIssuedHandlesDataArr.push({
            requestID,
            requestName,
            collectionName,
          })
        }
      })

      expect(expectedIssuedHandlesDataArr).toEqual(updatedIssuedHandlesDataArr)
    })

    it("Successfully updates the store and issued handles for requests under affected collections while moving a REST collection between deeply nested collections", async () => {
      restCollectionStore.subject$.next({
        state:
          MOVE_REST_COLLECTION_STORE_MOCK.BETWEEN_DEEPLY_NESTED_COLLECTIONS,
      })

      const collectionIDs = [
        "0/0/0/0/0",
        "0/0/0/0/0/0",
        "0/0/0/0/1",
        "0/0/0/0/1/0",
        "0/0/0/0/2",
        "0/0/0/0/2/0",
        "1/0/0/0/0",
        "1/0/0/0/0/0",
      ]

      const issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      collectionIDs.forEach((collectionID) => {
        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID, requestCount: 1 },
        ])

        issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
      })

      personalWorkspaceProviderService.issuedHandles = issuedHandles

      const draggedCollectionID = "0/0/0/0/1"
      const destinationCollectionID = "1/0/0/0/0"

      const draggedCollectionHandle =
        await personalWorkspaceProviderService.getRESTCollectionHandle(
          workspaceHandle,
          draggedCollectionID
        )

      if (E.isLeft(draggedCollectionHandle)) {
        throw new Error(draggedCollectionHandle.left?.toString())
      }

      await personalWorkspaceProviderService.moveRESTCollection(
        draggedCollectionHandle.right,
        destinationCollectionID
      )

      const expectedIssuedHandlesDataArr = [
        // ID of the collection (`coll-0/0/0/0/0`) above the dragged collection (`coll-0/0/0/0/1`) remains the same
        {
          requestID: "0/0/0/0/0/0",
          requestName: "req-0/0/0/0/0/0",
          collectionName: "coll-0/0/0/0/0",
        },
        {
          requestID: "0/0/0/0/0/0/0",
          requestName: "req-0/0/0/0/0/0/0",
          collectionName: "coll-0/0/0/0/0/0",
        },

        // Collection (`coll-0/0/0/0/1`) moved from `0/0/0/0/1` to `1/0/0/0/0`
        {
          requestID: "1/0/0/0/0/1/0",
          requestName: "req-0/0/0/0/1/0",
          collectionName: "coll-0/0/0/0/1",
        },
        {
          requestID: "1/0/0/0/0/1/0/0",
          requestName: "req-0/0/0/0/1/0/0",
          collectionName: "coll-0/0/0/0/1/0",
        },

        // Index position of the collection below the dragged collection (`coll-0/0/0/0/2`) gets decreased by `1`
        {
          requestID: "0/0/0/0/1/0",
          requestName: "req-0/0/0/0/2/0",
          collectionName: "coll-0/0/0/0/2",
        },
        {
          requestID: "0/0/0/0/1/0/0",
          requestName: "req-0/0/0/0/2/0/0",
          collectionName: "coll-0/0/0/0/2/0",
        },

        // Request already present under the destination collection
        {
          requestID: "1/0/0/0/0/0",
          requestName: "req-1/0/0/0/0/0",
          collectionName: "coll-1/0/0/0/0",
        },
        // Collection (`coll-1/0/0/0/0/0`) already present under the destination collection (`coll-1/0/0/0/0`) remains the same
        {
          requestID: "1/0/0/0/0/0/0",
          requestName: "req-1/0/0/0/0/0/0",
          collectionName: "coll-1/0/0/0/0/0",
        },
      ]

      const updatedIssuedHandlesDataArr: {
        requestID: string
        requestName: string
        collectionName: string
      }[] = []

      personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
        if (handle.value.type === "ok" && "requestID" in handle.value.data) {
          const { requestID, request } = handle.value.data

          const collectionID = requestID.split("/").slice(0, -1).join("/")

          const { name: requestName } = request

          const collectionName = navigateToFolderWithIndexPath(
            personalWorkspaceProviderService.restCollectionState.value.state,
            collectionID.split("/").map((id) => parseInt(id))
          )!.name

          updatedIssuedHandlesDataArr.push({
            requestID,
            requestName,
            collectionName,
          })
        }
      })

      expect(expectedIssuedHandlesDataArr).toEqual(updatedIssuedHandlesDataArr)
    })

    describe("Moving a REST collection to a sibling collection below it", () => {
      it("Successfully updates the store and issued handles for requests under affected collections while moving a REST collection to a collection at the same level", async () => {
        restCollectionStore.subject$.next({
          state:
            MOVE_REST_COLLECTION_STORE_MOCK.SIBLING_COLLECTION_BELOW_SAME_LEVEL,
        })

        const collectionIDs = [
          "0/0",
          "0/0/0",
          "0/1",
          "0/1/0",
          "0/2",
          "0/2/0",
          "0/3",
          "0/3/0",
          "0/4",
          "0/4/0",
        ]

        const issuedHandles: WritableHandleRef<
          WorkspaceRequest | WorkspaceCollection
        >[] = []

        collectionIDs.forEach((collectionID) => {
          const issuedHandleValues = generateIssuedHandleValues([
            { collectionID, requestCount: 1 },
          ])

          issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
        })

        personalWorkspaceProviderService.issuedHandles = issuedHandles

        const draggedCollectionID = "0/0"
        const destinationCollectionID = "0/2"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getRESTCollectionHandle(
            workspaceHandle,
            draggedCollectionID
          )

        if (E.isLeft(draggedCollectionHandle)) {
          throw new Error(draggedCollectionHandle.left?.toString())
        }

        await personalWorkspaceProviderService.moveRESTCollection(
          draggedCollectionHandle.right,
          destinationCollectionID
        )

        const expectedIssuedHandlesDataArr = [
          // Collection dragged from `0/0` to `0/2` (resolves to `0/1` on drop)
          {
            requestID: "0/1/1/0",
            requestName: "req-0/0/0",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/1/1/0/0",
            requestName: "req-0/0/0/0",
            collectionName: "coll-0/0/0",
          },

          // Index position of the collection (`coll-0/1`) below the dragged collection (`coll-0/0`) gets decreased by `1`
          {
            requestID: "0/0/0",
            requestName: "req-0/1/0",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/0/0/0",
            requestName: "req-0/1/0/0",
            collectionName: "coll-0/1/0",
          },

          // Index positions of the destination collection & the one's below gets decreased by `1`(`0/2` -> `0/1`) to account for the moved collection
          {
            requestID: "0/1/0",
            requestName: "req-0/2/0",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/1/0/0",
            requestName: "req-0/2/0/0",
            collectionName: "coll-0/2/0",
          },

          {
            requestID: "0/2/0",
            requestName: "req-0/3/0",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/2/0/0",
            requestName: "req-0/3/0/0",
            collectionName: "coll-0/3/0",
          },

          {
            requestID: "0/3/0",
            requestName: "req-0/4/0",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/3/0/0",
            requestName: "req-0/4/0/0",
            collectionName: "coll-0/4/0",
          },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
          collectionName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { collectionID, requestID, request } = handle.value.data

            const { name: requestName } = request

            const collectionName = navigateToFolderWithIndexPath(
              personalWorkspaceProviderService.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )!.name

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
              collectionName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })

      it("Successfully updates the store and issued handles for requests under affected collections while moving a REST collection to a nested child collection", async () => {
        restCollectionStore.subject$.next({
          state:
            MOVE_REST_COLLECTION_STORE_MOCK.SIBLING_COLLECTION_BELOW_NESTED_LEVEL,
        })

        const collectionIDs = [
          "0/0",
          "0/0/0",
          "0/1",
          "0/1/0",
          "0/2",
          "0/2/0",
          "0/3",
          "0/3/0",
          "0/4",
          "0/4/0",
        ]

        const issuedHandles: WritableHandleRef<
          WorkspaceRequest | WorkspaceCollection
        >[] = []

        collectionIDs.forEach((collectionID) => {
          const issuedHandleValues = generateIssuedHandleValues([
            { collectionID, requestCount: 1 },
          ])

          issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
        })

        personalWorkspaceProviderService.issuedHandles = issuedHandles

        const draggedCollectionID = "0/0"
        const destinationCollectionID = "0/2/0/0"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getRESTCollectionHandle(
            workspaceHandle,
            draggedCollectionID
          )

        if (E.isLeft(draggedCollectionHandle)) {
          throw new Error(draggedCollectionHandle.left?.toString())
        }

        await personalWorkspaceProviderService.moveRESTCollection(
          draggedCollectionHandle.right,
          destinationCollectionID
        )

        const expectedIssuedHandlesDataArr = [
          // Collection dragged from `0/0` to `0/2/0/0` (resolves to `0/1` on drop)
          {
            requestID: "0/1/0/0/0/0",
            requestName: "req-0/0/0",
            collectionName: "coll-0/0",
          },
          {
            requestID: "0/1/0/0/0/0/0",
            requestName: "req-0/0/0/0",
            collectionName: "coll-0/0/0",
          },

          // Index positions of collections appearing below the dragged collection (`coll-0/0`) gets decreased by `1`
          {
            requestID: "0/0/0",
            requestName: "req-0/1/0",
            collectionName: "coll-0/1",
          },
          {
            requestID: "0/0/0/0",
            requestName: "req-0/1/0/0",
            collectionName: "coll-0/1/0",
          },

          {
            requestID: "0/1/0",
            requestName: "req-0/2/0",
            collectionName: "coll-0/2",
          },
          {
            requestID: "0/1/0/0",
            requestName: "req-0/2/0/0",
            collectionName: "coll-0/2/0",
          },

          {
            requestID: "0/2/0",
            requestName: "req-0/3/0",
            collectionName: "coll-0/3",
          },
          {
            requestID: "0/2/0/0",
            requestName: "req-0/3/0/0",
            collectionName: "coll-0/3/0",
          },

          {
            requestID: "0/3/0",
            requestName: "req-0/4/0",
            collectionName: "coll-0/4",
          },
          {
            requestID: "0/3/0/0",
            requestName: "req-0/4/0/0",
            collectionName: "coll-0/4/0/0",
          },
        ]

        const updatedIssuedHandlesDataArr: {
          requestID: string
          requestName: string
          collectionName: string
        }[] = []

        personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
          if (handle.value.type === "ok" && "requestID" in handle.value.data) {
            const { collectionID, requestID, request } = handle.value.data

            const { name: requestName } = request

            const collectionName = navigateToFolderWithIndexPath(
              personalWorkspaceProviderService.restCollectionState.value.state,
              collectionID.split("/").map((id) => parseInt(id))
            )!.name

            updatedIssuedHandlesDataArr.push({
              requestID,
              requestName,
              collectionName,
            })
          }
        })

        expect(expectedIssuedHandlesDataArr).toEqual(
          updatedIssuedHandlesDataArr
        )
      })
    })
  })

  describe("removeRESTRequest", () => {
    it("Returns a `Left` value `INVALID_REQUEST_HANDLE` on supplying an invalid request handle", async () => {
      // Simulating an invalid request handle
      const requestHandle = {
        get: () =>
          ref({
            type: "invalid" as const,
            reason: "INVALID_REQUEST_HANDLE",
          }),
      }

      const removeRequestResult =
        await personalWorkspaceProviderService.removeRESTRequest(requestHandle)

      expect(removeRequestResult).toEqual(
        E.left("INVALID_REQUEST_HANDLE" as const)
      )
    })

    it("Successfully updates the store and issued handles for affected requests appearing below while deleting a request", async () => {
      restCollectionStore.subject$.next({
        state: REMOVE_REST_REQUEST_STORE_MOCK,
      })

      const issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      const issuedHandleValues = generateIssuedHandleValues([
        { collectionID: "0", requestCount: 6 },
      ])

      issuedHandles.push(...issuedHandleValues.map(getWritableHandle))

      personalWorkspaceProviderService.issuedHandles = issuedHandles

      const requestIDToRemove = "0/2"

      const requestHandleToRemove =
        await personalWorkspaceProviderService.getRESTRequestHandle(
          workspaceHandle,
          requestIDToRemove
        )

      if (E.isLeft(requestHandleToRemove)) {
        throw new Error(requestHandleToRemove.left?.toString())
      }

      await personalWorkspaceProviderService.removeRESTRequest(
        requestHandleToRemove.right
      )

      const expectedIssuedHandlesDataArr = [
        {
          requestID: "0/0",
          requestName: "req-0/0",
          collectionName: "coll-0",
        },
        {
          requestID: "0/1",
          requestName: "req-0/1",
          collectionName: "coll-0",
        },

        // IDs for the requests appearing below the deleted request (`req-0/2`) gets reduced by `1`
        {
          requestID: "0/2",
          requestName: "req-0/3",
          collectionName: "coll-0",
        },
        {
          requestID: "0/3",
          requestName: "req-0/4",
          collectionName: "coll-0",
        },
        {
          requestID: "0/4",
          requestName: "req-0/5",
          collectionName: "coll-0",
        },
      ]

      const updatedIssuedHandlesDataArr: {
        requestID: string
        requestName: string
        collectionName: string
      }[] = []

      personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
        if (handle.value.type === "ok" && "requestID" in handle.value.data) {
          const { collectionID, requestID, request } = handle.value.data

          const { name: requestName } = request

          const collectionName = navigateToFolderWithIndexPath(
            personalWorkspaceProviderService.restCollectionState.value.state,
            collectionID.split("/").map((id) => parseInt(id))
          )!.name

          updatedIssuedHandlesDataArr.push({
            requestID,
            requestName,
            collectionName,
          })
        }
      })

      expect(expectedIssuedHandlesDataArr).toEqual(updatedIssuedHandlesDataArr)
    })
  })

  describe("removeRESTCollection", () => {
    it("Returns a `Left` value `INVALID_COLLECTION_HANDLE` on supplying an invalid collection handle", async () => {
      // Simulating an invalid collection handle
      const collectionHandle = {
        get: () =>
          ref({
            type: "invalid" as const,
            reason: "INVALID_COLLECTION_HANDLE",
          }),
      }

      const removeCollectionResult =
        await personalWorkspaceProviderService.removeRESTCollection(
          collectionHandle
        )

      expect(removeCollectionResult).toEqual(
        E.left("INVALID_COLLECTION_HANDLE" as const)
      )
    })

    it("Successfully updates the store and issued handles for affected requests appearing at any child level below while deleting a collection", async () => {
      restCollectionStore.subject$.next({
        state: REMOVE_REST_COLLECTION_STORE_MOCK,
      })

      const collectionIDs = [
        "0",
        "0/0",
        "0/0/0",
        "0/0/0/0",
        "1",
        "1/0",
        "2",
        "2/0",
      ]

      const issuedHandles: WritableHandleRef<
        WorkspaceRequest | WorkspaceCollection
      >[] = []

      collectionIDs.forEach((collectionID) => {
        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID, requestCount: 2 },
        ])

        issuedHandles.push(...issuedHandleValues.map(getWritableHandle))
      })

      personalWorkspaceProviderService.issuedHandles = issuedHandles

      const collectionIDToRemove = "0"

      const collectionHandleToRemove =
        await personalWorkspaceProviderService.getRESTCollectionHandle(
          workspaceHandle,
          collectionIDToRemove
        )

      if (E.isLeft(collectionHandleToRemove)) {
        throw new Error(collectionHandleToRemove.left?.toString())
      }

      await personalWorkspaceProviderService.removeRESTCollection(
        collectionHandleToRemove.right
      )

      const expectedIssuedHandlesDataArr = [
        {
          requestID: "0/0",
          requestName: "req-1/0",
          collectionName: "coll-1",
        },
        {
          requestID: "0/1",
          requestName: "req-1/1",
          collectionName: "coll-1",
        },
        {
          requestID: "0/0/0",
          requestName: "req-1/0/0",
          collectionName: "coll-1/0",
        },
        {
          requestID: "0/0/1",
          requestName: "req-1/0/1",
          collectionName: "coll-1/0",
        },
        {
          requestID: "1/0",
          requestName: "req-2/0",
          collectionName: "coll-2",
        },
        {
          requestID: "1/1",
          requestName: "req-2/1",
          collectionName: "coll-2",
        },
        {
          requestID: "1/0/0",
          requestName: "req-2/0/0",
          collectionName: "coll-2/0",
        },
        {
          requestID: "1/0/1",
          requestName: "req-2/0/1",
          collectionName: "coll-2/0",
        },
      ]

      const updatedIssuedHandlesDataArr: {
        requestID: string
        requestName: string
        collectionName: string
      }[] = []

      personalWorkspaceProviderService.issuedHandles.forEach((handle) => {
        if (handle.value.type === "ok" && "requestID" in handle.value.data) {
          const { collectionID, requestID, request } = handle.value.data

          const { name: requestName } = request

          const collectionName = navigateToFolderWithIndexPath(
            personalWorkspaceProviderService.restCollectionState.value.state,
            collectionID.split("/").map((id) => parseInt(id))
          )!.name

          updatedIssuedHandlesDataArr.push({
            requestID,
            requestName,
            collectionName,
          })
        }
      })

      expect(expectedIssuedHandlesDataArr).toEqual(updatedIssuedHandlesDataArr)
    })
  })
})
