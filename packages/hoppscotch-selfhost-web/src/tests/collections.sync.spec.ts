import { describe, it, beforeEach, expect } from "vitest"
import {
  changeParentForAllChildrenFromMapper,
  getChildrenEntriesFromMapper,
  getDirectChildrenEntriesFromMapper,
  moveCollectionInMapper,
  moveRequestInMapper,
  removeAllChildCollectionsFromMapper,
  removeAllChildRequestsFromMapper,
  removeAndReorderEntries,
  reorderCollectionsInMapper,
  reorderIndexesAfterEntryRemoval,
  reorderRequestsMapper,
} from "@platform/collections/collections.mapper"

import {
  restCollectionsMapper,
  restRequestsMapper,
} from "@platform/collections/collections.sync"
import { createMapper } from "@lib/sync/mapper"
import {
  addRESTCollection,
  // moveRESTFolder,
  setRESTCollections,
} from "@hoppscotch/common/newstore/collections"

import { HoppRESTRequest, makeCollection } from "@hoppscotch/data"

const getEntriesArrayFromMapper = (
  mapper: ReturnType<typeof createMapper<string, string>>
) => Array.from(mapper.getValue().entries())

describe("getChildrenEntriesFromMapper", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("getChildrenEntriesFromMapper - get children of root collection", () => {
    const childrenCollections = getChildrenEntriesFromMapper(
      "0",
      restCollectionsMapper
    )

    const childrenRequests = getChildrenEntriesFromMapper(
      "0",
      restRequestsMapper
    )

    expect(childrenCollections).toMatchInlineSnapshot(`
      [
        [
          "0/0",
          "Folder 1",
        ],
        [
          "0/1",
          "Folder 2",
        ],
        [
          "0/1/0",
          "Folder 3",
        ],
      ]
    `)

    expect(childrenRequests).toMatchInlineSnapshot(`
      [
        [
          "0/0/0",
          "Request 1",
        ],
        [
          "0/1/0/0",
          "Request 2",
        ],
        [
          "0/0",
          "Request 3",
        ],
      ]
    `)
  })

  it("getChildrenEntriesFromMapper - get children of folder", () => {
    const childrenCollections = getChildrenEntriesFromMapper(
      "0/1",
      restCollectionsMapper
    )

    const childrenRequests = getChildrenEntriesFromMapper(
      "0/1",
      restRequestsMapper
    )

    expect(childrenCollections).toMatchInlineSnapshot(`
      [
        [
          "0/1/0",
          "Folder 3",
        ],
      ]
    `)

    expect(childrenRequests).toMatchInlineSnapshot(`
      [
        [
          "0/1/0/0",
          "Request 2",
        ],
      ]
    `)
  })

  it("getChildrenEntriesFromMapper - get children when the path is empty aka rootlevel", () => {
    const childrenCollections = getChildrenEntriesFromMapper(
      "",
      restCollectionsMapper
    )

    const childrenRequests = getChildrenEntriesFromMapper(
      "",
      restRequestsMapper
    )

    expect(childrenCollections).toMatchInlineSnapshot(`
      [
        [
          "0",
          "Collection 1",
        ],
        [
          "0/0",
          "Folder 1",
        ],
        [
          "0/1",
          "Folder 2",
        ],
        [
          "0/1/0",
          "Folder 3",
        ],
        [
          "1",
          "Collection 2",
        ],
        [
          "1/0",
          "Folder 4",
        ],
        [
          "1/0/0",
          "Folder 5",
        ],
      ]
    `)

    expect(childrenRequests).toMatchInlineSnapshot(`
      [
        [
          "0/0/0",
          "Request 1",
        ],
        [
          "0/1/0/0",
          "Request 2",
        ],
        [
          "0/0",
          "Request 3",
        ],
        [
          "1/0/0/0",
          "Request 4",
        ],
        [
          "1/0",
          "Request 6",
        ],
        [
          "1/1",
          "Request 7",
        ],
      ]
    `)
  })
})

describe("getDirectChildrenEntriesFromMapper", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("getDirectChildrenEntriesFromMapper - get direct children of root collection", () => {
    const childrenCollections = getDirectChildrenEntriesFromMapper(
      "0",
      restCollectionsMapper
    )

    const childrenRequests = getDirectChildrenEntriesFromMapper(
      "0",
      restRequestsMapper
    )

    expect(childrenCollections).toMatchInlineSnapshot(`
      [
        [
          "0/0",
          "Folder 1",
        ],
        [
          "0/1",
          "Folder 2",
        ],
      ]
    `)

    expect(childrenRequests).toMatchInlineSnapshot(`
      [
        [
          "0/0",
          "Request 3",
        ],
      ]
    `)
  })

  it("getDirectChildrenEntriesFromMapper - get direct children of folder", () => {
    const childrenCollections = getDirectChildrenEntriesFromMapper(
      "0/1",
      restCollectionsMapper
    )

    const childrenRequests = getDirectChildrenEntriesFromMapper(
      "0/1",
      restRequestsMapper
    )

    expect(childrenCollections).toMatchInlineSnapshot(`
      [
        [
          "0/1/0",
          "Folder 3",
        ],
      ]
    `)

    expect(childrenRequests).toMatchInlineSnapshot("[]")
  })

  it("getDirectChildrenEntriesFromMapper - get direct children when the path is empty aka rootlevel", () => {
    const childrenCollections = getDirectChildrenEntriesFromMapper(
      "",
      restCollectionsMapper
    )

    const childrenRequests = getDirectChildrenEntriesFromMapper(
      "",
      restRequestsMapper
    )

    expect(childrenCollections).toMatchInlineSnapshot(`
      [
        [
          "0",
          "Collection 1",
        ],
        [
          "1",
          "Collection 2",
        ],
      ]
    `)

    // we do not have root level requests, so this will always be empty
    expect(childrenRequests).toMatchInlineSnapshot("[]")
  })
})

describe("removeAllChildCollectionsFromMapper", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("removeAllChildCollectionsFromMapper - remove all child collections of a root collection", () => {
    removeAllChildCollectionsFromMapper("0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
      [
        [
          "0",
          "Collection 1",
        ],
        [
          "1",
          "Collection 2",
        ],
        [
          "1/0",
          "Folder 4",
        ],
        [
          "1/0/0",
          "Folder 5",
        ],
      ]
    `)
  })

  it("removeAllChildCollectionsFromMapper - remove all child collections of a folder", () => {
    removeAllChildCollectionsFromMapper("1/0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "0/1/0",
            "Folder 3",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
        ]
      `)
  })

  it("removeAllChildCollectionsFromMapper - remove all child collections when the path is empty aka rootlevel", () => {
    removeAllChildCollectionsFromMapper("", "REST")

    expect(
      getEntriesArrayFromMapper(restCollectionsMapper)
    ).toMatchInlineSnapshot("[]")
  })
})

describe("removeAllChildRequestsFromMapper", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("removeAllChildRequestsFromMapper - remove all child requests of a root collection", () => {
    removeAllChildRequestsFromMapper("0", "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
        ]
      `)
  })

  it("removeAllChildRequestsFromMapper - remove all child requests of a folder", () => {
    removeAllChildRequestsFromMapper("1/0", "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/1/0/0",
            "Request 2",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
        ]
      `)
  })

  it("removeAllChildRequestsFromMapper - remove all child requests when the path is empty aka rootlevel", () => {
    removeAllChildRequestsFromMapper("", "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper)).toMatchInlineSnapshot(
      "[]"
    )
  })
})

describe("changeParentForAllChildrenFromMapper", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("changes parent for all children", () => {
    restCollectionsMapper.removeEntry(undefined, "0")
    removeAllChildCollectionsFromMapper("0", "REST")
    removeAllChildRequestsFromMapper("0", "REST")

    // for our usecases we assume that the newParentPath does not exist
    // so we are not caring about children that are already present in the newParentPath
    // also remember this function does not rename the parent, in this case, parentCollection "1" will still be named 1, but it won't have any children
    changeParentForAllChildrenFromMapper("1", "0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "1",
            "Collection 2",
          ],
          [
            "0/0",
            "Folder 4",
          ],
          [
            "0/0/0",
            "Folder 5",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0/0",
            "Request 4",
          ],
          [
            "0/0",
            "Request 6",
          ],
          [
            "0/1",
            "Request 7",
          ],
        ]
      `)
  })
})

describe("reorderIndexesAfterEntryRemoval", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("reorderIndexesAfterEntryRemoval - reorder a collection", () => {
    restCollectionsMapper.removeEntry(undefined, "0/0")
    removeAllChildCollectionsFromMapper("0/0", "REST")
    removeAllChildRequestsFromMapper("0/0", "REST")

    reorderIndexesAfterEntryRemoval("0", restCollectionsMapper, "REST")
    reorderIndexesAfterEntryRemoval("0", restRequestsMapper, "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "1/0/0",
            "Folder 5",
          ],
          [
            "0/0",
            "Folder 2",
          ],
          [
            "0/0/0",
            "Folder 3",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper)).toMatchInlineSnapshot(
      `
      [
        [
          "0/0",
          "Request 3",
        ],
        [
          "1/0/0/0",
          "Request 4",
        ],
        [
          "1/0",
          "Request 6",
        ],
        [
          "1/1",
          "Request 7",
        ],
        [
          "0/0/0/0",
          "Request 2",
        ],
      ]
    `
    )
  })

  it("reorderIndexesAfterEntryRemoval - reorder when the path is empty aka rootlevel", () => {
    restCollectionsMapper.removeEntry(undefined, "0")
    removeAllChildCollectionsFromMapper("0", "REST")
    removeAllChildRequestsFromMapper("0", "REST")

    reorderIndexesAfterEntryRemoval("", restCollectionsMapper, "REST")
    reorderIndexesAfterEntryRemoval("", restRequestsMapper, "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 2",
          ],
          [
            "0/0",
            "Folder 4",
          ],
          [
            "0/0/0",
            "Folder 5",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper)).toMatchInlineSnapshot(
      `
      [
        [
          "0/0/0/0",
          "Request 4",
        ],
        [
          "0/0",
          "Request 6",
        ],
        [
          "0/1",
          "Request 7",
        ],
      ]
    `
    )
  })
})

describe("removeAndReorderEntries", () => {
  beforeEach(cleanUpAndSeedMappers)

  it("removeAndReorderEntries - removing a collection", () => {
    removeAndReorderEntries("0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 2",
          ],
          [
            "0/0",
            "Folder 4",
          ],
          [
            "0/0/0",
            "Folder 5",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0/0",
            "Request 4",
          ],
          [
            "0/0",
            "Request 6",
          ],
          [
            "0/1",
            "Request 7",
          ],
        ]
      `)
  })

  it("removeAndReorderEntries - removing a folder", () => {
    removeAndReorderEntries("0/0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "1/0/0",
            "Folder 5",
          ],
          [
            "0/0",
            "Folder 2",
          ],
          [
            "0/0/0",
            "Folder 3",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "0/0/0/0",
            "Request 2",
          ],
        ]
      `)
  })
})

describe("moveRequestsInMapper", () => {
  beforeEach(() => {
    cleanUpAndSeedMappers()
    // the moveRequestInMapper function uses the collections store
    cleanUpAndSeedStore()
  })

  it("moveRequestsInMapper - move request from collection to collection", () => {
    moveRequestInMapper(0, "1", "0", "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/1/0/0",
            "Request 2",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 7",
          ],
          [
            "0/1",
            "Request 6",
          ],
        ]
      `)
  })

  it("moveRequestsInMapper - move request from folder to collection", () => {
    moveRequestInMapper(0, "0/1/0", "1", "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "1/2",
            "Request 2",
          ],
        ]
      `)
  })

  it("moveRequestsInMapper - move request from folder to folder", () => {
    moveRequestInMapper(0, "0/1/0", "1/0/0", "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "1/0/0/1",
            "Request 2",
          ],
        ]
      `)
  })
})

describe("moveCollectionInMapper", () => {
  beforeEach(() => {
    cleanUpAndSeedMappers()
    // the moveCollectionInMapper function uses the collections store
    cleanUpAndSeedStore()
  })

  it("moveCollectionInMapper - move folder form collection to collection", () => {
    // moveRESTFolder("1/0/0", "0")
    moveCollectionInMapper("1/0/0", "0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "0/1/0",
            "Folder 3",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "0/2",
            "Folder 5",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/1/0/0",
            "Request 2",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "0/2/0",
            "Request 4",
          ],
        ]
      `)
  })

  it("moveCollectionsInMapper - move folder from folder to folder", () => {
    // moveRESTFolder("1/0/0", "0/1/0")
    moveCollectionInMapper("1/0/0", "0/1/0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "0/1/0",
            "Folder 3",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "0/1/0/0",
            "Folder 5",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/1/0/0",
            "Request 2",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "0/1/0/0/0",
            "Request 4",
          ],
        ]
      `)
  })

  it("moveCollectionsInMapper - move folder in same collection to another folder in same collection", () => {
    moveCollectionInMapper("0/1/0", "0/0", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "1/0/0",
            "Folder 5",
          ],
          [
            "0/0/0",
            "Folder 3",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "0/0/0/0",
            "Request 2",
          ],
        ]
      `)
  })
})

describe("reorderRequestsMapper", () => {
  beforeEach(() => {
    cleanUpAndSeedMappers()

    // just adding some extra requests specifically for testing this function
    restRequestsMapper.addEntry("1/2", "Requests 8")
    restRequestsMapper.addEntry("1/3", "Requests 9")
    restRequestsMapper.addEntry("1/4", "Requests 10")
  })

  it("reorderRequestsMapper - reorders a request up down", () => {
    reorderRequestsMapper(0, "1", 3, "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/1/0/0",
            "Request 2",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 7",
          ],
          [
            "1/1",
            "Requests 8",
          ],
          [
            "1/2",
            "Request 6",
          ],
          [
            "1/3",
            "Requests 9",
          ],
          [
            "1/4",
            "Requests 10",
          ],
        ]
      `)
  })

  it("reorderRequestsMapper - reorders a request down up", () => {
    reorderRequestsMapper(3, "1", 2, "REST")

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0/0/0",
            "Request 1",
          ],
          [
            "0/1/0/0",
            "Request 2",
          ],
          [
            "0/0",
            "Request 3",
          ],
          [
            "1/0/0/0",
            "Request 4",
          ],
          [
            "1/0",
            "Request 6",
          ],
          [
            "1/1",
            "Request 7",
          ],
          [
            "1/2",
            "Requests 9",
          ],
          [
            "1/3",
            "Requests 8",
          ],
          [
            "1/4",
            "Requests 10",
          ],
        ]
      `)
  })
})

describe("reorderCollectionsMapper", () => {
  beforeEach(() => {
    cleanUpAndSeedMappers()

    // adding some extra collections specifically for testing this function
    restCollectionsMapper.addEntry("2", "Collection 3")
    restCollectionsMapper.addEntry("3", "Collection 4")
    restCollectionsMapper.addEntry("4", "Collection 5")
    restCollectionsMapper.addEntry("5", "Collection 6")
  })

  it("reorderCollectionsMapper - reorders a collection up down", () => {
    reorderCollectionsInMapper("2", "5", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "0/1/0",
            "Folder 3",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "1/0/0",
            "Folder 5",
          ],
          [
            "2",
            "Collection 4",
          ],
          [
            "3",
            "Collection 5",
          ],
          [
            "4",
            "Collection 3",
          ],
          [
            "5",
            "Collection 6",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
      [
        [
          "0/0/0",
          "Request 1",
        ],
        [
          "0/1/0/0",
          "Request 2",
        ],
        [
          "0/0",
          "Request 3",
        ],
        [
          "1/0/0/0",
          "Request 4",
        ],
        [
          "1/0",
          "Request 6",
        ],
        [
          "1/1",
          "Request 7",
        ],
      ]
    `)
  })

  it("reorderCollectionsMapper - reorders a folder up down", () => {
    // add extra folders to test this case
    restCollectionsMapper.addEntry("1/1", "Folder 6")
    restCollectionsMapper.addEntry("1/1/0", "Child Folder 1")
    restCollectionsMapper.addEntry("1/2", "Folder 7")
    restCollectionsMapper.addEntry("1/2/0", "Child Folder 2")
    restCollectionsMapper.addEntry("1/3", "Folder 8")
    restCollectionsMapper.addEntry("1/3/0", "Child Folder 3")
    restCollectionsMapper.addEntry("1/4", "Folder 9")
    restCollectionsMapper.addEntry("1/4/0", "Child Folder 4")

    reorderCollectionsInMapper("1/2", "1/4", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "0/1/0",
            "Folder 3",
          ],
          [
            "1",
            "Collection 2",
          ],
          [
            "1/0",
            "Folder 4",
          ],
          [
            "1/0/0",
            "Folder 5",
          ],
          [
            "2",
            "Collection 3",
          ],
          [
            "3",
            "Collection 4",
          ],
          [
            "4",
            "Collection 5",
          ],
          [
            "5",
            "Collection 6",
          ],
          [
            "1/1",
            "Folder 6",
          ],
          [
            "1/1/0",
            "Child Folder 1",
          ],
          [
            "1/2",
            "Folder 8",
          ],
          [
            "1/3",
            "Folder 7",
          ],
          [
            "1/4",
            "Folder 9",
          ],
          [
            "1/4/0",
            "Child Folder 4",
          ],
          [
            "1/2/0",
            "Child Folder 3",
          ],
          [
            "1/3/0",
            "Child Folder 2",
          ],
        ]
      `)

    expect(getEntriesArrayFromMapper(restRequestsMapper))
      .toMatchInlineSnapshot(`
      [
        [
          "0/0/0",
          "Request 1",
        ],
        [
          "0/1/0/0",
          "Request 2",
        ],
        [
          "0/0",
          "Request 3",
        ],
        [
          "1/0/0/0",
          "Request 4",
        ],
        [
          "1/0",
          "Request 6",
        ],
        [
          "1/1",
          "Request 7",
        ],
      ]
    `)
  })

  it("reorderRequestsMapper - reorders a collection down up", () => {
    reorderCollectionsInMapper("3", "1", "REST")

    expect(getEntriesArrayFromMapper(restCollectionsMapper))
      .toMatchInlineSnapshot(`
        [
          [
            "0",
            "Collection 1",
          ],
          [
            "0/0",
            "Folder 1",
          ],
          [
            "0/1",
            "Folder 2",
          ],
          [
            "0/1/0",
            "Folder 3",
          ],
          [
            "1",
            "Collection 4",
          ],
          [
            "2",
            "Collection 2",
          ],
          [
            "3",
            "Collection 3",
          ],
          [
            "4",
            "Collection 5",
          ],
          [
            "5",
            "Collection 6",
          ],
          [
            "2/0",
            "Folder 4",
          ],
          [
            "2/0/0",
            "Folder 5",
          ],
        ]
      `)
  })
})

function cleanUpAndSeedMappers() {
  // remove all collections
  Array.from(restCollectionsMapper.getValue().entries()).forEach(([path]) => {
    restCollectionsMapper.removeEntry(undefined, path)
  })

  // remove all requests
  Array.from(restRequestsMapper.getValue().entries()).forEach(([path]) => {
    restRequestsMapper.removeEntry(undefined, path)
  })

  // populate sample collections and requests
  /**
   * 0. Collection 1
   *      0. Folder 1
   *          0. Request 1
   *      1. Folder 2
   *          0. Folder 3
   *              0.Request 2
   *      0. Request 3
   * 1. Collection 2
   *      0. Folder 4
   *          0. Folder 5
   *              0. Request 4
   *      0. Request 6
   *      1. Request 7
   */
  restCollectionsMapper.addEntry("0", "Collection 1")

  restCollectionsMapper.addEntry("0/0", "Folder 1")
  restCollectionsMapper.addEntry("0/1", "Folder 2")
  restCollectionsMapper.addEntry("0/1/0", "Folder 3")

  restRequestsMapper.addEntry("0/0/0", "Request 1")
  restRequestsMapper.addEntry("0/1/0/0", "Request 2")
  restRequestsMapper.addEntry("0/0", "Request 3")
  restCollectionsMapper.addEntry("1", "Collection 2")
  restCollectionsMapper.addEntry("1/0", "Folder 4")
  restCollectionsMapper.addEntry("1/0/0", "Folder 5")

  restRequestsMapper.addEntry("1/0/0/0", "Request 4")
  restRequestsMapper.addEntry("1/0", "Request 6")
  restRequestsMapper.addEntry("1/1", "Request 7")
}

function cleanUpAndSeedStore() {
  // reset the store
  setRESTCollections([])

  /**
   * * 0. Collection 1
   *      0. Folder 1
   *          0. Request 1
   *      1. Folder 2
   *          0. Folder 3
   *              0.Request 2
   *      0. Request 3
   * 1. Collection 2
   *      0. Folder 4
   *          0. Folder 5
   *              0. Request 4
   *      0. Request 6
   *      1. Request 7
   */

  addRESTCollection(
    makeCollection({
      name: "Collection 1",
      folders: [
        makeCollection({
          name: "Folder 1",
          folders: [],
          requests: [makeEmptyRequest("Request 1")],
        }),
        makeCollection({
          name: "Folder 2",
          folders: [
            makeCollection({
              name: "Folder 3",
              folders: [],
              requests: [makeEmptyRequest("Request 2")],
            }),
          ],
          requests: [],
        }),
      ],
      requests: [makeEmptyRequest("Request 3")],
    })
  )

  addRESTCollection(
    makeCollection({
      name: "Collection 2",
      folders: [
        makeCollection({
          name: "Folder 4",
          folders: [
            makeCollection({
              name: "Folder 5",
              folders: [],
              requests: [makeEmptyRequest("Request 4")],
            }),
          ],
          requests: [],
        }),
      ],
      requests: [makeEmptyRequest("Request 6"), makeEmptyRequest("Request 7")],
    })
  )
}

function makeEmptyRequest(name: string): HoppRESTRequest {
  return {
    name,
    auth: {
      authType: "none",
      authActive: false,
    },
    endpoint: "",
    body: {
      contentType: null,
      body: null,
    },
    headers: [],
    params: [],
    method: "GET",
    preRequestScript: "",
    v: "1",
    testScript: "",
  }
}
