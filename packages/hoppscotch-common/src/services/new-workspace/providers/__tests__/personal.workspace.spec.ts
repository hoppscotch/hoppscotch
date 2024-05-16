import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it } from "vitest"
import { computed, ref } from "vue"

import { getDefaultRESTRequest } from "@hoppscotch/data"
import {
  navigateToFolderWithIndexPath,
  restCollectionStore,
} from "~/newstore/collections"
import { HandleState, WritableHandleRef } from "../../handle"
import { WorkspaceRequest } from "../../workspace"
import { PersonalWorkspaceProviderService } from "../personal.workspace"

const generateIssuedHandleValues = (
  collectionsAndRequests: { collectionID: string; requestCount: number }[]
) => {
  const providerID = "PERSONAL_WORKSPACE_PROVIDER"
  const workspaceID = "personal"
  const issuedHandleValues: HandleState<WorkspaceRequest, unknown>[] = []

  collectionsAndRequests.forEach(({ collectionID, requestCount }) => {
    for (let i = 0; i < requestCount; i++) {
      const requestID = `${collectionID}/${i}`

      issuedHandleValues.push({
        type: "ok" as const,
        data: {
          providerID: providerID,
          workspaceID: workspaceID,
          collectionID,
          requestID,
          request: {
            ...getDefaultRESTRequest(),
            name: `req-${requestID}`,
          },
        },
      })
    }
  })

  return issuedHandleValues
}

describe("PersonalWorkspaceProviderService", () => {
  const container = new TestContainer()

  const personalWorkspaceProviderService = container.bind(
    PersonalWorkspaceProviderService
  )

  const workspaceHandle =
    personalWorkspaceProviderService.getPersonalWorkspaceHandle()

  describe("moveRESTRequest", () => {
    it("Successfully moves a top-level REST request between collections", async () => {
      restCollectionStore.subject$.next({
        state: [
          {
            v: 2,
            folders: [],
            requests: [],
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-0",
            id: "clw90c6wo008juuv7pmxbldtg",
          },
          {
            v: 2,
            folders: [],
            requests: Array.from({ length: 6 }, (_, idx) => ({
              ...getDefaultRESTRequest(),
              name: `req-1/${idx}`,
            })),
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-1",
            id: "clw90c8h3008kuuv7w5ssmxsp",
          },
          {
            v: 2,
            folders: [],
            requests: [],
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-2",
            id: "clw90ca5u008luuv7voy2npwr",
          },
          {
            name: "coll-3",
            folders: [],
            requests: Array.from({ length: 3 }, (_, idx) => ({
              ...getDefaultRESTRequest(),
              name: `req-3/${idx}`,
            })),
            v: 2,
            auth: {
              authType: "inherit",
              authActive: false,
            },
            headers: [],
            id: "clw90cbsn008muuv70vf8a2t3",
          },
          {
            v: 2,
            folders: [],
            requests: [],
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-4",
            id: "clw90cd5c008nuuv7oh2ut1lt",
          },
        ],
      })

      const issuedHandleValues = generateIssuedHandleValues([
        { collectionID: "1", requestCount: 6 },
        { collectionID: "3", requestCount: 3 },
      ])

      personalWorkspaceProviderService.issuedHandles = issuedHandleValues.map(
        (value) => {
          const handleRefData = ref(value)

          const writableHandle = computed({
            get() {
              return handleRefData.value
            },
            set(newValue) {
              handleRefData.value = newValue
            },
          })

          return writableHandle
        }
      )

      // Request (req-1/2) moved from `1/2` to `3/3`
      // It will appear towards the end in the destination collection
      const draggedRequestID = "1/2"
      const destinationCollectionID = "3"

      const workspaceHandle =
        personalWorkspaceProviderService.getPersonalWorkspaceHandle()

      const draggedRequestHandle =
        await personalWorkspaceProviderService.getRequestHandle(
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
        if (handle.value.type === "ok") {
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

    it("Succesfully moves a REST request between deeply nested collections", async () => {
      restCollectionStore.subject$.next({
        state: [
          {
            id: "clw97umg70016if3uju9s8748",
            v: 2,
            name: "coll-007",
            folders: [
              {
                id: "clw97uoyy0017if3u9kmycozq",
                v: 2,
                name: "coll-1",
                folders: [
                  {
                    id: "clw97v5re0018if3uqbvqpxdr",
                    v: 2,
                    name: "coll-2",
                    folders: [
                      {
                        id: "clw97v7mj0019if3uo2ed0r7v",
                        v: 2,
                        name: "coll-3",
                        folders: [
                          {
                            id: "clw97vdwh001aif3uqg5knud8",
                            v: 2,
                            name: "coll-4",
                            folders: [],
                            requests: Array.from({ length: 4 }, (_, idx) => ({
                              ...getDefaultRESTRequest(),
                              name: `req-0/0/0/0/0/${idx}`,
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
                          authActive: true,
                        },
                        headers: [],
                      },
                    ],
                    requests: [],
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
          {
            id: "clw97w6sv001bif3uh5bqh3aa",
            v: 2,
            name: "coll-5",
            folders: [
              {
                id: "clw97w99n001cif3uin46cvb5",
                v: 2,
                name: "coll-6",
                folders: [
                  {
                    id: "clw97wbqu001dif3utkqoha71",
                    v: 2,
                    name: "coll-7",
                    folders: [
                      {
                        id: "clw97xjps001gif3ule83c0zf",
                        v: 2,
                        name: "coll-8",
                        folders: [],
                        requests: Array.from({ length: 2 }, (_, idx) => ({
                          ...getDefaultRESTRequest(),
                          name: `req-1/0/0/0/${idx}`,
                        })),
                        auth: {
                          authType: "inherit",
                          authActive: false,
                        },
                        headers: [],
                      },
                    ],
                    requests: [],
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

      const issuedHandleValues = generateIssuedHandleValues([
        { collectionID: "0/0/0/0/0", requestCount: 4 },
        { collectionID: "1/0/0/0", requestCount: 2 },
      ])

      personalWorkspaceProviderService.issuedHandles = issuedHandleValues.map(
        (value) => {
          const handleRefData = ref(value)

          const writableHandle = computed({
            get() {
              return handleRefData.value
            },
            set(newValue) {
              handleRefData.value = newValue
            },
          })

          return writableHandle
        }
      )

      // Request (req-0/0/0/0/0/1) moved from `0/0/0/0/0/1` to `1/0/0/0/2`
      // It will appear towards the end in the destination collection
      const draggedRequestID = "0/0/0/0/0/1"
      const destinationCollectionID = "1/0/0/0"

      const draggedRequestHandle =
        await personalWorkspaceProviderService.getRequestHandle(
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
        if (handle.value.type === "ok") {
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
    describe("Reordering a REST request to the destination above it", () => {
      let issuedHandles: WritableHandleRef<WorkspaceRequest>[] = []

      beforeEach(() => {
        restCollectionStore.subject$.next({
          state: [
            {
              v: 2,
              folders: [
                {
                  v: 2,
                  folders: [
                    {
                      v: 2,
                      folders: [],
                      requests: Array.from({ length: 10 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/0/0/${idx}`,
                      })),
                      headers: [],
                      auth: {
                        authType: "inherit",
                        authActive: false,
                      },
                      name: "coll-0/0/0",
                      id: "clw90c6wo008juuv7pmxbldtg",
                    },
                  ],
                  requests: [],
                  headers: [],
                  auth: {
                    authType: "inherit",
                    authActive: false,
                  },
                  name: "coll-0/0",
                  id: "clw90c6wo008juuv7pmxbldtg",
                },
              ],
              requests: [],
              headers: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
              name: "coll-0",
              id: "clw90c6wo008juuv7pmxbldtg",
            },
          ],
        })

        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID: "0/0/0", requestCount: 10 },
        ])

        issuedHandles = issuedHandleValues.map((value) => {
          const handleRefData = ref(value)

          const writableHandle = computed({
            get() {
              return handleRefData.value
            },
            set(newValue) {
              handleRefData.value = newValue
            },
          })

          return writableHandle
        })
      })

      it("Successfully reorders a REST request to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/7) dragged from `0/0/0/7` to `0/0/0/2`
        const draggedRequestID = "0/0/0/7"
        const destinationCollectionID = "0/0/0"
        const destinationRequestID = "0/0/0/2"

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationCollectionID,
          destinationRequestID
        )

        const expectedIssuedHandlesDataArr = [
          { requestID: "0/0/0/0", requestName: "req-0/0/0/0" },
          { requestID: "0/0/0/1", requestName: "req-0/0/0/1" },

          // Indiex positions for requests appearing below the destination index position gets increased by `1`
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
          if (handle.value.type === "ok") {
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

      it("Successfully reorders a REST request to the first position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/5) dragged from `0/0/0/5` to `0/0/0/0`
        const draggedRequestID = "0/0/0/5"
        const destinationCollectionID = "0/0/0"
        const destinationRequestID = "0/0/0/0"

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationCollectionID,
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
          if (handle.value.type === "ok") {
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
      let issuedHandles: WritableHandleRef<WorkspaceRequest>[] = []

      beforeEach(() => {
        restCollectionStore.subject$.next({
          state: [
            {
              v: 2,
              folders: [
                {
                  v: 2,
                  folders: [
                    {
                      v: 2,
                      folders: [],
                      requests: Array.from({ length: 10 }, (_, idx) => ({
                        ...getDefaultRESTRequest(),
                        name: `req-0/0/0/${idx}`,
                      })),
                      headers: [],
                      auth: {
                        authType: "inherit",
                        authActive: false,
                      },
                      name: "coll-0/0/0",
                      id: "clw90c6wo008juuv7pmxbldtg",
                    },
                  ],
                  requests: [],
                  headers: [],
                  auth: {
                    authType: "inherit",
                    authActive: false,
                  },
                  name: "coll-0/0",
                  id: "clw90c6wo008juuv7pmxbldtg",
                },
              ],
              requests: [],
              headers: [],
              auth: {
                authType: "inherit",
                authActive: false,
              },
              name: "coll-0",
              id: "clw90c6wo008juuv7pmxbldtg",
            },
          ],
        })

        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID: "0/0/0", requestCount: 10 },
        ])

        issuedHandles = issuedHandleValues.map((value) => {
          const handleRefData = ref(value)

          const writableHandle = computed({
            get() {
              return handleRefData.value
            },
            set(newValue) {
              handleRefData.value = newValue
            },
          })

          return writableHandle
        })
      })

      it("Successfully reorders a REST request to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/3) dragged from `0/0/0/3` to `0/0/0/8`
        const draggedRequestID = "0/0/0/3"
        const destinationCollectionID = "0/0/0"
        const destinationRequestID = "0/0/0/8"

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationCollectionID,
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
          if (handle.value.type === "ok") {
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

      it("Successfully reorders a REST request to the last position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Request (req-0/0/0/5) dragged from `0/0/0/5` to `0/0/0/9`
        const draggedRequestID = "0/0/0/5"
        const destinationCollectionID = "0/0/0"
        // Indicates move to the last position `0/0/0/9`
        const destinationRequestID = null

        const draggedRequestHandle =
          await personalWorkspaceProviderService.getRequestHandle(
            workspaceHandle,
            draggedRequestID
          )

        if (E.isLeft(draggedRequestHandle)) {
          throw new Error(draggedRequestHandle.left?.toString())
        }

        await personalWorkspaceProviderService.reorderRESTRequest(
          draggedRequestHandle.right,
          destinationCollectionID,
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
          if (handle.value.type === "ok") {
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
    describe("Reordering a REST collection to the destination above it", () => {
      let issuedHandles: WritableHandleRef<WorkspaceRequest>[] = []

      beforeEach(() => {
        // Reset b/w test cases
        if (issuedHandles.length > 0) {
          issuedHandles = []
        }

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

          issuedHandles.push(
            ...issuedHandleValues.map((value) => {
              const handleRefData = ref(value)

              const writableHandle = computed({
                get() {
                  return handleRefData.value
                },
                set(newValue) {
                  handleRefData.value = newValue
                },
              })

              return writableHandle
            })
          )
        })
      })

      it("Successfully reorders a REST collection to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/3) dragged from `0/3` to `0/1`
        const draggedCollectionID = "0/3"
        const destinationCollectionID = "0/1"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getCollectionHandle(
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
          if (handle.value.type === "ok") {
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

      it("Successfully reorders a REST collection to the first position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/2) dragged from `0/2` to `0/0`
        const draggedCollectionID = "0/2"
        const destinationCollectionID = "0/0"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getCollectionHandle(
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
          if (handle.value.type === "ok") {
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
      let issuedHandles: WritableHandleRef<WorkspaceRequest>[] = []

      beforeEach(() => {
        // Reset b/w test cases
        if (issuedHandles.length > 0) {
          issuedHandles = []
        }

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

          issuedHandles.push(
            ...issuedHandleValues.map((value) => {
              const handleRefData = ref(value)

              const writableHandle = computed({
                get() {
                  return handleRefData.value
                },
                set(newValue) {
                  handleRefData.value = newValue
                },
              })

              return writableHandle
            })
          )
        })
      })

      it("Successfully reorders a REST collection to a position in between", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/0) dragged from `0/0` to `0/2`
        const draggedCollectionID = "0/0"
        const destinationCollectionID = "0/2"

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getCollectionHandle(
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
          if (handle.value.type === "ok") {
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

        expect(expectedIssuedHandlesDataArr).toStrictEqual(
          updatedIssuedHandlesDataArr
        )
      })

      it("Successfully reorders a REST collection to the last position", async () => {
        personalWorkspaceProviderService.issuedHandles = issuedHandles

        // Collection (coll-0/1) dragged from `0/1` to `0/4` (final resolved destination ID after reorder)
        const draggedCollectionID = "0/1"
        // Indicates move to the last position
        const destinationCollectionID = null

        const draggedCollectionHandle =
          await personalWorkspaceProviderService.getCollectionHandle(
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
          if (handle.value.type === "ok") {
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

        expect(expectedIssuedHandlesDataArr).toStrictEqual(
          updatedIssuedHandlesDataArr
        )
      })
    })
  })

  describe("moveRESTCollection", () => {
    it("Successfully moves a REST collection to be one among the root nodes", async () => {
      restCollectionStore.subject$.next({
        state: [
          {
            v: 2,
            folders: [],
            requests: [],
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-0",
          },
          {
            v: 2,
            folders: [
              {
                v: 2,
                name: "coll-1/0",
                folders: [
                  {
                    v: 2,
                    name: "coll-1/0/0",
                    folders: [],
                    requests: [
                      {
                        ...getDefaultRESTRequest(),
                        name: "req-1/0/0/0",
                      },
                    ],
                    auth: {
                      authType: "inherit",
                      authActive: true,
                    },
                    headers: [],
                  },
                ],
                requests: [
                  {
                    ...getDefaultRESTRequest(),
                    name: "req-1/0/0",
                  },
                ],
                auth: {
                  authType: "inherit",
                  authActive: true,
                },
                headers: [],
              },
              {
                v: 2,
                name: "coll-1/1",
                folders: [
                  {
                    v: 2,
                    name: "coll-1/1/0",
                    folders: [],
                    requests: [
                      {
                        ...getDefaultRESTRequest(),
                        name: "req-1/1/0/0",
                      },
                    ],
                    auth: {
                      authType: "inherit",
                      authActive: true,
                    },
                    headers: [],
                  },
                ],
                requests: [
                  {
                    ...getDefaultRESTRequest(),
                    name: "req-1/1/0",
                  },
                ],
                auth: {
                  authType: "inherit",
                  authActive: true,
                },
                headers: [],
              },
              {
                v: 2,
                name: "coll-1/2",
                folders: [
                  {
                    v: 2,
                    name: "coll-1/2/0",
                    folders: [],
                    requests: [
                      {
                        ...getDefaultRESTRequest(),
                        name: "req-1/2/0/0",
                      },
                    ],
                    auth: {
                      authType: "inherit",
                      authActive: true,
                    },
                    headers: [],
                  },
                ],
                requests: [
                  {
                    ...getDefaultRESTRequest(),
                    name: "req-1/2/0",
                  },
                ],
                auth: {
                  authType: "inherit",
                  authActive: true,
                },
                headers: [],
              },
            ],
            requests: [],
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-1",
          },
          {
            v: 2,
            folders: [],
            requests: [],
            headers: [],
            auth: {
              authType: "inherit",
              authActive: false,
            },
            name: "coll-2",
          },
        ],
      })

      const collectionIDs = ["1/0", "1/0/0", "1/1", "1/1/0", "1/2", "1/2/0"]

      const issuedHandles: WritableHandleRef<WorkspaceRequest>[] = []

      collectionIDs.forEach((collectionID) => {
        const issuedHandleValues = generateIssuedHandleValues([
          { collectionID, requestCount: 1 },
        ])

        issuedHandles.push(
          ...issuedHandleValues.map((value) => {
            const handleRefData = ref(value)

            const writableHandle = computed({
              get() {
                return handleRefData.value
              },
              set(newValue) {
                handleRefData.value = newValue
              },
            })

            return writableHandle
          })
        )
      })

      personalWorkspaceProviderService.issuedHandles = issuedHandles

      const draggedCollectionID = "1/1"
      const destinationCollectionID = null

      const draggedCollectionHandle =
        await personalWorkspaceProviderService.getCollectionHandle(
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

      // const expectedIssuedHandlesDataArr = [
      //   // ID of the collection at the top (`coll-0`) of the dragged collection (`coll-1`) remains the same
      //   {
      //     requestID: "0/0",
      //     requestName: "req-1/0/0",
      //     collectionName: "coll-0",
      //   },
      //   {
      //     requestID: "0/0/0",
      //     requestName: "req-1/0/0/0",
      //     collectionName: "coll-0",
      //   },

      //   // Collection (`coll-1`) dragged from `1/1` to the root
      //   {
      //     requestID: "1/0",
      //     requestName: "req-1/1/0",
      //     collectionName: "coll-1",
      //   },
      //   {
      //     requestID: "1/0/0",
      //     requestName: "req-1/1/0/0",
      //     collectionName: "coll-1",
      //   },

      //   // ID of the collections (`coll-2`) below the dragged collection (`coll-1`) remains the same
      //   {
      //     requestID: "2/0",
      //     requestName: "req-1/2/0",
      //     collectionName: "coll-2",
      //   },
      //   {
      //     requestID: "2/0/0",
      //     requestName: "req-1/2/0/0",
      //     collectionName: "coll-2",
      //   },
      // ]

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
        if (handle.value.type === "ok") {
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

      expect(expectedIssuedHandlesDataArr).toStrictEqual(
        updatedIssuedHandlesDataArr
      )
    })
  })
})
