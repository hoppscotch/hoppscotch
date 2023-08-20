import { faker } from "@faker-js/faker"
import { generateKeyBetween } from "fractional-indexing"

import type {
  UpdatedHoppCollection,
  UpdatedHoppRESTRequest,
} from "~/services/collections/collections.service"

// TODO: implement options for this, allow people to select a random collection with a specific depth
export function selectARandomCollection(
  collections: UpdatedHoppCollection[],
  seed?: number
) {
  faker.seed(seed)

  return faker.helpers.arrayElement(collections)
}

// the function body here is duplicated, keeping it because i might add extra options specific to selecting requests here
export function selectARandomRequest(
  requests: UpdatedHoppRESTRequest[],
  seed?: number
) {
  faker.seed(seed)

  return faker.helpers.arrayElement(requests)
}

export function dummyHopp() {
  const dummyHoppAPI = {
    seed,
    rootCollections,
  }

  /*
    @param {number} value - The seed value to use for generating random data. if you set a seed, you can get the generate the same data again by using the same seed value.
  */
  function seed(value: number) {
    faker.seed(value)
    return dummyHoppAPI
  }

  function rootCollections(count: number) {
    let maxDepthValue = 0
    let minDepthValue = 0
    let childCountMinValue = 0
    let childCountMaxValue = 0
    let requestCountMixValue = 0
    let requestCountMinValue = 0

    const rootCollectionsAPI = {
      maxDepth,
      minDepth,
      childCountMin,
      childCountMax,
      requestCountMin,
      requestCountMax,
      get,
    }

    function maxDepth(value: number) {
      maxDepthValue = value

      return rootCollectionsAPI
    }

    function minDepth(value: number) {
      minDepthValue = value

      return rootCollectionsAPI
    }

    function childCountMin(value: number) {
      childCountMinValue = value

      return rootCollectionsAPI
    }

    function childCountMax(value: number) {
      childCountMaxValue = value

      return rootCollectionsAPI
    }

    function requestCountMin(value: number) {
      requestCountMinValue = value

      return rootCollectionsAPI
    }

    function requestCountMax(value: number) {
      requestCountMixValue = value

      return rootCollectionsAPI
    }

    function get() {
      const collections: UpdatedHoppCollection[] = []
      const requests: UpdatedHoppRESTRequest[] = []

      // this should go when generating the child collections
      // we'll pick random number between the min and max depth
      // and then generate the child collections for that depth

      // we are generating root collections here, so we have to generate the exact number of collections as count
      // so min and max values dont make sense
      const rootCollections = generateChildCollections(count, count, null, "")

      rootCollections.map((collection, index) => {
        const collectionDepth = faker.number.int({
          min: minDepthValue,
          max: maxDepthValue,
        })

        const { collections: childCollections, requests: childRequests } =
          generateCollectionsRecursively(
            childCountMinValue,
            childCountMaxValue,
            requestCountMinValue,
            requestCountMixValue,
            collection.id,
            collectionDepth,
            `${index}`
          )

        // push the root collection
        collections.push(collection)

        collections.push(...childCollections)
        requests.push(...childRequests)
      })

      return {
        collections: collections,
        requests: requests,
      }
    }

    return rootCollectionsAPI
  }

  return dummyHoppAPI
}

function makeDummyRequest(
  parentCollectionID: string,
  previousOrder: string | null,
  parentRequestNameString?: string
) {
  const name =
    parentRequestNameString != undefined
      ? `Request ${parentRequestNameString}`
      : faker.lorem.words(2)

  const request: UpdatedHoppRESTRequest = {
    id: faker.string.uuid(),
    name: name,
    method: faker.helpers.arrayElement([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ]),
    endpoint: faker.internet.url(),
    params: [],
    headers: [],
    preRequestScript: "",
    testScript: "",
    auth: {
      authType: "none",
      authActive: false,
    },
    body: {
      contentType: null,
      body: null,
    },
    parentCollectionID,
    v: "1",
    order: generateKeyBetween(previousOrder, null),
  }

  return request
}

function makeDummyCollection(
  previousOrder: string | null,
  parentCollectionID: string | null,
  parentCollectionNameString?: string
) {
  const name =
    parentCollectionNameString != undefined
      ? `Collection ${parentCollectionNameString}`
      : faker.lorem.words(2)

  const collection: UpdatedHoppCollection = {
    id: faker.string.uuid(),
    name,
    parentCollectionID,
    order: generateKeyBetween(previousOrder, null),
    v: 1,
  }

  return collection
}

function generateChildRequests(
  requestCountMinValue: number,
  requestCountMaxValue: number,
  parentCollectionID: string,
  parentCollectionNameString?: string
) {
  const childCount = faker.number.int({
    min: requestCountMinValue,
    max: requestCountMaxValue,
  })

  let previousOrder: string | null = null

  const requests: UpdatedHoppRESTRequest[] = []

  for (let i = 0; i < childCount; i++) {
    const request = makeDummyRequest(
      parentCollectionID,
      previousOrder,
      makeCollectionName(parentCollectionNameString, i)
    )
    previousOrder = request.order

    requests.push(request)
  }

  return requests
}

function generateChildCollections(
  childCountMinValue: number,
  childCountMaxValue: number,
  parentCollectionID: string | null,
  parentCollectionNameString?: string
) {
  const childCount = faker.number.int({
    min: childCountMinValue,
    max: childCountMaxValue,
  })

  let previousOrder: string | null = null

  const collections: UpdatedHoppCollection[] = []

  for (let i = 0; i < childCount; i++) {
    const collection = makeDummyCollection(
      previousOrder,
      parentCollectionID,
      makeCollectionName(parentCollectionNameString, i)
    )
    previousOrder = collection.order

    collections.push(collection)
  }

  return collections
}

function makeCollectionName(
  parentCollectionNameString: string | undefined,
  suffix: number
): string | undefined {
  return parentCollectionNameString != undefined
    ? parentCollectionNameString === ""
      ? `${suffix}`
      : `${parentCollectionNameString}.${suffix}`
    : undefined
}

function generateCollectionsRecursively(
  childCountMinValue: number,
  childCountMaxValue: number,
  requestCountMinValue: number,
  requestCountMixValue: number,
  parentCollectionID: string,
  depth: number,
  parentCollectionNameString?: string
): {
  collections: UpdatedHoppCollection[]
  requests: UpdatedHoppRESTRequest[]
} {
  const collections: UpdatedHoppCollection[] = []
  const requests: UpdatedHoppRESTRequest[] = generateChildRequests(
    requestCountMinValue,
    requestCountMixValue,
    parentCollectionID,
    parentCollectionNameString
  )

  if (!depth) {
    return {
      collections: [],
      requests,
    }
  }

  const childCollections = generateChildCollections(
    childCountMinValue,
    childCountMaxValue,
    parentCollectionID,
    parentCollectionNameString
  )

  childCollections.map((collection, index) => {
    const collectionsAndRequests = generateCollectionsRecursively(
      childCountMinValue,
      childCountMaxValue,
      requestCountMinValue,
      requestCountMixValue,
      collection.id,
      depth - 1,
      makeCollectionName(parentCollectionNameString, index)
    )

    collections.push(...collectionsAndRequests.collections)
    requests.push(...collectionsAndRequests.requests)
  })

  return {
    collections: [...childCollections, ...collections],
    requests,
  }
}
