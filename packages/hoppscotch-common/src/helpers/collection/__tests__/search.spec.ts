import {
  getDefaultRESTRequest,
  HoppCollection,
  makeCollection,
} from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { searchCollectionChildren, searchCollections } from "../search"

const request = (name: string, endpoint = "https://example.com") => ({
  ...getDefaultRESTRequest(),
  name,
  endpoint,
})

const collection = (
  name: string,
  requests: HoppCollection["requests"] = [],
  folders: HoppCollection[] = []
) =>
  makeCollection({
    name,
    folders,
    requests,
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
  })

const petStore = collection(
  "Pet Store",
  [request("List pets"), request("Create pet"), request("Delete pet")],
  [
    collection(
      "Owners",
      [request("List owners"), request("Delete owner")],
      [collection("Archive", [request("Old request")])]
    ),
    collection("Deleted items", [request("Restore"), request("Purge")]),
  ]
)

const collections = [collection("Users", [request("List users")]), petStore]

const names = (items: { data: { name: string } }[]) =>
  items.map(({ data }) => data.name)

describe("searchCollections", () => {
  test("lists every collection at its own position without a search", () => {
    expect(searchCollections(collections, "")).toEqual([
      { index: 0, data: collections[0] },
      { index: 1, data: collections[1] },
    ])
  })

  test("keeps the unfiltered position of a matching collection", () => {
    expect(searchCollections(collections, "delete")).toEqual([
      { index: 1, data: petStore },
    ])
  })

  test("matches a collection by its name, its requests or its folders", () => {
    expect(names(searchCollections(collections, "USERS"))).toEqual(["Users"])
    expect(names(searchCollections(collections, "create"))).toEqual([
      "Pet Store",
    ])
    expect(names(searchCollections(collections, "owners"))).toEqual([
      "Pet Store",
    ])
    expect(searchCollections(collections, "nothing")).toEqual([])
  })
})

describe("searchCollectionChildren", () => {
  test("keeps the unfiltered position of matching requests and folders", () => {
    const { folders, requests } = searchCollectionChildren(
      petStore,
      1,
      "delete"
    )

    expect(requests).toEqual([{ index: 2, data: petStore.requests[2] }])
    expect(folders).toEqual([
      { index: 0, data: petStore.folders[0] },
      { index: 1, data: petStore.folders[1] },
    ])
  })

  test("matches a request by its endpoint", () => {
    const parent = collection("APIs", [
      request("First", "https://example.com/a"),
      request("Second", "https://example.com/needle"),
    ])

    expect(searchCollectionChildren(parent, 1, "needle").requests).toEqual([
      { index: 1, data: parent.requests[1] },
    ])
  })

  test("matches a GraphQL request by its URL", () => {
    const parent = collection("GraphQL", [
      { ...getDefaultGQLRequest(), name: "First", url: "https://a.test" },
      { ...getDefaultGQLRequest(), name: "Second", url: "https://needle.test" },
    ])

    expect(searchCollectionChildren(parent, 1, "needle").requests).toEqual([
      { index: 1, data: parent.requests[1] },
    ])
  })

  test("lists only the matching requests of a folder found through them", () => {
    const { folders, requests } = searchCollectionChildren(
      petStore.folders[0],
      2,
      "delete"
    )

    expect(requests).toEqual([
      { index: 1, data: petStore.folders[0].requests[1] },
    ])
    expect(names(folders)).toEqual(["Archive"])
  })

  test("lists a folder found by its own name whole, and only once", () => {
    const { folders } = searchCollectionChildren(petStore, 1, "delete")

    expect(names(folders)).toEqual(["Owners", "Deleted items"])
    expect(
      names(searchCollectionChildren(petStore.folders[1], 2, "delete").requests)
    ).toEqual(["Restore", "Purge"])
  })

  test("lists everything without a search or below the searched levels", () => {
    expect(names(searchCollectionChildren(petStore, 1, "").requests)).toEqual([
      "List pets",
      "Create pet",
      "Delete pet",
    ])
    expect(
      searchCollectionChildren(petStore.folders[0].folders[0], 3, "delete")
        .requests
    ).toEqual([{ index: 0, data: petStore.folders[0].folders[0].requests[0] }])
  })
})
