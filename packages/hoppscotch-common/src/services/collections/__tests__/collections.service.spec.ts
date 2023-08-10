import { beforeEach, describe, expect, it } from "vitest"
import { beforeAll } from "vitest"
import { dummyHopp, selectARandomCollection } from "~/helpers/dummyHopp"

import { TestContainer } from "dioc/testing"

import { CollectionsService } from "~/services/collections/collections.service"

interface CollectionsServiceTestContext {
  container: TestContainer
}

beforeEach<CollectionsServiceTestContext>((context) => {
  context.container = new TestContainer()
})

describe("addCollection", () => {
  it<CollectionsServiceTestContext>("should add a collection to the store", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { addCollection, setCollections } = collectionsStore

    const collections = dummyHopp()
      .seed(123)
      .rootCollections(2)
      .childCountMin(1)
      .childCountMax(1)
      .get()

    setCollections(collections.collections)

    const id = await addCollection({
      name: "Test Collection",
      v: 1,
      parentCollectionID: null,
    })

    expect(collectionsStore.collections.value).toMatchObject([
      ...collections.collections,
      {
        id,
        name: "Test Collection",
        v: 1,
        parentCollectionID: null,
        order: "a2",
      },
    ])
  })
})

describe("editCollection", () => {
  it<CollectionsServiceTestContext>("should edit a collection", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { editCollection, setCollections } = collectionsStore

    const collections = dummyHopp()
      .seed(123)
      .rootCollections(2)
      .childCountMin(1)
      .childCountMax(1)
      .get()

    setCollections(collections.collections)

    const { id } = selectARandomCollection(collections.collections, 123)

    await editCollection(id, {
      name: "Updated Collection",
      parentCollectionID: "random_id",
      order: "test_order",
    })

    const updatedCollection = collectionsStore.collections.value.find(
      (collection) => collection.id === id
    )

    expect(updatedCollection).toMatchInlineSnapshot(`
      {
        "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
        "name": "Updated Collection",
        "order": "test_order",
        "parentCollectionID": "random_id",
        "v": 1,
      }
    `)
  })
})

describe("removeCollection", () => {
  it<CollectionsServiceTestContext>("should remove a collection", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { removeCollection, setCollections } = collectionsStore

    const collections = dummyHopp()
      .seed(123)
      .rootCollections(2)
      .childCountMin(1)
      .childCountMax(1)
      .get()

    setCollections(collections.collections)

    const { id } = selectARandomCollection(collections.collections, 123)

    await removeCollection(id)

    const updatedCollection = collectionsStore.collections.value.find(
      (collection) => collection.id === id
    )

    expect(updatedCollection).toBeUndefined()
  })
})

describe("updateCollectionOrder", () => {
  it<CollectionsServiceTestContext>("should reorder root collections - not first/last collection", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { updateCollectionOrder, setCollections } = collectionsStore

    const collections = dummyHopp().seed(123).rootCollections(6).get()

    setCollections(collections.collections)

    const sourceCollection = collections.collections[2]
    const destinationCollection = collections.collections[4]

    // for this test, we'll move Collection 4 to position 2
    // await updateCollectionOrder(sourceCollection.id, destinationCollection.id)
    await updateCollectionOrder(sourceCollection.id, destinationCollection.id)

    expect(collectionsStore.orderedCollections.value).toMatchInlineSnapshot(`
      [
        {
          "id": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "name": "Collection 0",
          "order": "a0",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "name": "Collection 1",
          "order": "a1",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "7f3869c1-7dc9-4486-b504-56bade487a49",
          "name": "Collection 3",
          "order": "a3",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "60627261-4e6c-4ebf-9887-9914576ade41",
          "name": "Collection 2",
          "order": "a3V",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "94a8d215-ce32-4379-8318-e2aebf079488",
          "name": "Collection 4",
          "order": "a4",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "42cb158b-e836-45ed-adb5-6034668b8f05",
          "name": "Collection 5",
          "order": "a5",
          "parentCollectionID": null,
          "v": 1,
        },
      ]
    `)
  })

  it<CollectionsServiceTestContext>("should reorder root collections - to first collection", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { updateCollectionOrder, setCollections } = collectionsStore

    const collections = dummyHopp().seed(123).rootCollections(6).get()

    setCollections(collections.collections)

    const sourceCollection = collections.collections[4]
    const destinationCollection = collections.collections[0]

    // for this test, we'll move Collection 4 to start of the list
    await updateCollectionOrder(sourceCollection.id, destinationCollection.id)

    expect(collectionsStore.orderedCollections.value).toMatchInlineSnapshot(`
      [
        {
          "id": "94a8d215-ce32-4379-8318-e2aebf079488",
          "name": "Collection 4",
          "order": "Zz",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "name": "Collection 0",
          "order": "a0",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "name": "Collection 1",
          "order": "a1",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "60627261-4e6c-4ebf-9887-9914576ade41",
          "name": "Collection 2",
          "order": "a2",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "7f3869c1-7dc9-4486-b504-56bade487a49",
          "name": "Collection 3",
          "order": "a3",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "42cb158b-e836-45ed-adb5-6034668b8f05",
          "name": "Collection 5",
          "order": "a5",
          "parentCollectionID": null,
          "v": 1,
        },
      ]
    `)
  })

  it<CollectionsServiceTestContext>("should reorder root collections - to last collection", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { updateCollectionOrder, setCollections } = collectionsStore

    const collections = dummyHopp().seed(123).rootCollections(6).get()

    setCollections(collections.collections)

    const sourceCollection = collections.collections[2]

    // for this test, we'll move Collection 2 to the end
    await updateCollectionOrder(sourceCollection.id, null)

    expect(collectionsStore.orderedCollections.value).toMatchInlineSnapshot(`
      [
        {
          "id": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "name": "Collection 0",
          "order": "a0",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "name": "Collection 1",
          "order": "a1",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "7f3869c1-7dc9-4486-b504-56bade487a49",
          "name": "Collection 3",
          "order": "a3",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "94a8d215-ce32-4379-8318-e2aebf079488",
          "name": "Collection 4",
          "order": "a4",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "42cb158b-e836-45ed-adb5-6034668b8f05",
          "name": "Collection 5",
          "order": "a5",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "60627261-4e6c-4ebf-9887-9914576ade41",
          "name": "Collection 2",
          "order": "a6",
          "parentCollectionID": null,
          "v": 1,
        },
      ]
    `)
  })
})

describe("moveCollection", () => {
  it<CollectionsServiceTestContext>("should move a root collection to another collection", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { moveCollection, setCollections, getChildCollections } =
      collectionsStore

    const collections = dummyHopp()
      .seed(123)
      .rootCollections(6)
      .childCountMin(2)
      .childCountMax(2)
      .minDepth(2)
      .maxDepth(2)
      .get()

    setCollections(collections.collections)

    const rootCollections = collections.collections.filter(
      (collection) => !collection.parentCollectionID
    )

    // we're moving Collection 2 to Collection 4
    const sourceCollection = rootCollections[2]
    const destinationCollection = rootCollections[4]

    await moveCollection(sourceCollection.id, destinationCollection.id)

    // Collection 2 is not a root collection anymore
    expect(collectionsStore.rootCollections.value).toMatchInlineSnapshot(`
      [
        {
          "id": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "name": "Collection 0",
          "order": "a0",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "name": "Collection 1",
          "order": "a1",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "7f3869c1-7dc9-4486-b504-56bade487a49",
          "name": "Collection 3",
          "order": "a3",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "94a8d215-ce32-4379-8318-e2aebf079488",
          "name": "Collection 4",
          "order": "a4",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "42cb158b-e836-45ed-adb5-6034668b8f05",
          "name": "Collection 5",
          "order": "a5",
          "parentCollectionID": null,
          "v": 1,
        },
      ]
    `)

    // Collection 2 is now a child of Collection 4
    expect(getChildCollections(destinationCollection.id).value)
      .toMatchInlineSnapshot(`
      [
        {
          "id": "36c32c21-9f34-4b65-8a49-fe0fa805c935",
          "name": "Collection 4.0",
          "order": "a0",
          "parentCollectionID": "94a8d215-ce32-4379-8318-e2aebf079488",
          "v": 1,
        },
        {
          "id": "1a0bea80-3497-4f43-9c92-890f8e0320cf",
          "name": "Collection 4.1",
          "order": "a1",
          "parentCollectionID": "94a8d215-ce32-4379-8318-e2aebf079488",
          "v": 1,
        },
        {
          "id": "60627261-4e6c-4ebf-9887-9914576ade41",
          "name": "Collection 2",
          "order": "a2",
          "parentCollectionID": "94a8d215-ce32-4379-8318-e2aebf079488",
          "v": 1,
        },
      ]
    `)
  })

  it<CollectionsServiceTestContext>("should move a child collection to root ", async ({
    container,
  }) => {
    const collectionsStore = container.bind(CollectionsService)

    const { moveCollection, setCollections, getChildCollections } =
      collectionsStore

    const collections = dummyHopp()
      .seed(123)
      .rootCollections(6)
      .childCountMin(2)
      .childCountMax(2)
      .minDepth(2)
      .maxDepth(2)
      .get()

    setCollections(collections.collections)

    const rootCollections = collections.collections.filter(
      (collection) => !collection.parentCollectionID
    )

    const sourceCollection = collections.collections.filter(
      (collection) => collection.parentCollectionID === rootCollections[4].id
    )[0]

    // we're moving Collection 4.0 to root
    await moveCollection(sourceCollection.id, null)

    // Collection 4.0 is now a root collection
    expect(collectionsStore.rootCollections.value).toMatchInlineSnapshot(`
      [
        {
          "id": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "name": "Collection 0",
          "order": "a0",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "name": "Collection 1",
          "order": "a1",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "60627261-4e6c-4ebf-9887-9914576ade41",
          "name": "Collection 2",
          "order": "a2",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "7f3869c1-7dc9-4486-b504-56bade487a49",
          "name": "Collection 3",
          "order": "a3",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "94a8d215-ce32-4379-8318-e2aebf079488",
          "name": "Collection 4",
          "order": "a4",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "42cb158b-e836-45ed-adb5-6034668b8f05",
          "name": "Collection 5",
          "order": "a5",
          "parentCollectionID": null,
          "v": 1,
        },
        {
          "id": "36c32c21-9f34-4b65-8a49-fe0fa805c935",
          "name": "Collection 4.0",
          "order": "a6",
          "parentCollectionID": null,
          "v": 1,
        },
      ]
    `)

    // Collection 4.0 is not a child of Collection 4 anymore
    expect(getChildCollections(rootCollections[4].id).value)
      .toMatchInlineSnapshot(`
      [
        {
          "id": "1a0bea80-3497-4f43-9c92-890f8e0320cf",
          "name": "Collection 4.1",
          "order": "a1",
          "parentCollectionID": "94a8d215-ce32-4379-8318-e2aebf079488",
          "v": 1,
        },
      ]
    `)
  })
})
