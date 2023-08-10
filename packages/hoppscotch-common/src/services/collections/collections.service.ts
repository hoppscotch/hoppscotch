import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTParam,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { Service } from "dioc"
import { ref, computed } from "vue"
import { v4 as uuidV4 } from "uuid"
import { generateKeyBetween } from "fractional-indexing"

import { RequestsService } from "../requests/requests.service"

import * as E from "fp-ts/Either"

export type UpdatedHoppRESTRequest = {
  v: string
  name: string
  method: string
  endpoint: string
  params: HoppRESTParam[]
  headers: HoppRESTHeader[]
  preRequestScript: string
  testScript: string
  auth: HoppRESTAuth
  body: HoppRESTReqBody

  // changes from HoppRESTRequest
  order: string
  // id is mandatory now, for representing the backendID we'll use backendID
  id: string
  backendID?: string
  // parentCollectionID is mandatory for requests, since they can't be in the root for now
  parentCollectionID: string
}

export type UpdatedHoppCollection = {
  v: number
  name: string

  // changes from HoppCollection
  // removed folders & requests
  // id is mandatory now, for representing the backendID we'll use backendID
  id: string
  backendID?: string
  parentCollectionID: string | null
  order: string
}

export class CollectionsService extends Service {
  public static ID = "CollectionsService"

  public collections = ref<UpdatedHoppCollection[]>([])

  public requests = this.bind(RequestsService).requests

  public orderedCollections = computed(() => {
    return this.collections.value.sort((col1, col2) => {
      if (col1.order < col2.order) {
        return -1
      }

      if (col1.order > col2.order) {
        return 1
      }

      return 0
    })
  })

  public collectionTree = computed(() => {
    return makeCollectionTree(this.collections.value, this.requests.value)
  })

  public setCollections = (collectionsToSet: UpdatedHoppCollection[]) => {
    this.collections.value = Object.assign([], collectionsToSet)
  }

  public appendCollections = (collectionsToAppend: UpdatedHoppCollection[]) => {
    this.collections.value.push(...collectionsToAppend)
  }

  // tested
  public addCollection = (
    collection: Omit<UpdatedHoppCollection, "id" | "order">
  ) => {
    const id = uuidV4()

    let lastCollectionOrder: string | null

    const collectionsLength = this.orderedCollections.value.length

    if (collectionsLength > 0) {
      const lastCollection =
        this.orderedCollections.value[collectionsLength - 1]

      lastCollectionOrder = lastCollection.order
    } else {
      lastCollectionOrder = null
    }

    this.collections.value.push({
      id,
      ...collection,
      order: generateKeyBetween(lastCollectionOrder, null),
    })

    return id
  }

  // tested
  public removeCollection = (id: string) => {
    this.collections.value = this.collections.value.filter(
      (collection) => collection.id != id
    )
  }

  // tested
  public editCollection = (
    id: string,
    updatedCollectionFields: Partial<UpdatedHoppCollection>
  ) => {
    this.collections.value = this.collections.value.map((c) =>
      c.id === id ? { ...c, ...updatedCollectionFields } : c
    )
  }

  // tested
  public moveCollection = (
    sourceCollectionID: string,
    destinationCollectionID: string | null
  ) => {
    const sourceCollection = this.collections.value.find(
      (collection) => collection.id == sourceCollectionID
    )

    let destinationCollection: UpdatedHoppCollection | undefined

    if (!sourceCollection) {
      console.warn("Source Collection Not Found While Moving")
      return
    }

    if (destinationCollectionID) {
      destinationCollection = this.collections.value.find(
        (collection) => collection.id == destinationCollectionID
      )

      if (!destinationCollection) {
        console.warn("Destination Collection Not Found")
        return
      }
    }

    const destinationChildCollections = this.orderedCollections.value.filter(
      (collection) => collection.parentCollectionID == destinationCollectionID
    )

    const newOrder = generateKeyBetween(
      destinationChildCollections.at(-1)?.order ?? null,
      null
    )

    this.collections.value = this.collections.value.map((collection) =>
      collection.id == sourceCollectionID
        ? {
            ...collection,
            order: newOrder,
            parentCollectionID: destinationCollectionID,
          }
        : collection
    )
  }

  // tested
  public updateCollectionOrder = (
    sourceCollectionID: string,
    destinationCollectionID: string | null
  ) => {
    const reorder = reorderItems(
      sourceCollectionID,
      destinationCollectionID,
      this.collections.value,
      "parentCollectionID"
    )

    if (E.isRight(reorder)) {
      this.collections.value = reorder.right
    } else {
      console.warn("Error while reordering collections", reorder.left)
    }
  }

  // getters
  public rootCollections = computed(() => {
    const rootCollections = this.orderedCollections.value.filter(
      (collection) => collection.parentCollectionID == null
    )

    return rootCollections
  })

  public getChildCollections = (collectionID: string) =>
    computed(() => {
      const childCollections = this.orderedCollections.value.filter(
        (collection) => collection.parentCollectionID == collectionID
      )

      return childCollections
    })
}

function makeCollectionTree(
  collections: UpdatedHoppCollection[],
  requests: UpdatedHoppRESTRequest[]
) {
  const collectionsTree: HoppCollection<HoppRESTRequest>[] = []
  const collectionsMap = new Map<
    string,
    HoppCollection<HoppRESTRequest> & UpdatedHoppCollection
  >()

  // build a copy of the collections array with empty folders & requests
  // so we don't mutate the original argument array
  const hoppCollections = collections.map((collection) => ({
    ...collection,
    folders: [],
    requests: [],
  }))

  const uniqueParentCollectionIDs = new Set<string>()

  hoppCollections.forEach((collection) => {
    if (collection.parentCollectionID) {
      uniqueParentCollectionIDs.add(collection.parentCollectionID)
    } else {
      collectionsTree.push(collection)
    }

    collectionsMap.set(collection.id, collection)
  })

  const collectionsMapArray = Array.from(collectionsMap)

  uniqueParentCollectionIDs.forEach((parentCollectionID) => {
    const childCollections = collectionsMapArray
      .filter(([, collection]) => {
        return collection.parentCollectionID == parentCollectionID
      })
      .map(([, collection]) => collection)
      .sort((a, b) => a.order.localeCompare(b.order))

    const childRequests = requests
      .filter((request) => request.parentCollectionID == parentCollectionID)
      .sort((a, b) => a.order.localeCompare(b.order))

    const parentCollection = collectionsMap.get(parentCollectionID)
    parentCollection?.folders.push(...childCollections)
    parentCollection?.requests.push(...childRequests)
  })

  return collectionsTree
}

function reorderItems<
  ParentIDKey extends string,
  Reorderable extends { id: string; order: string } & {
    [key in ParentIDKey]: string | null
  }
>(
  sourceItemID: string,
  destinationItemID: string | null,
  items: Reorderable[],
  parentIDKey: ParentIDKey
) {
  const sourceItem = items.find((item) => item.id == sourceItemID)

  if (!sourceItem) {
    return E.left("Source Item Not Found While Reordering")
  }

  let destinationItem: Reorderable | undefined
  let destinationOrder: string | null = null

  if (destinationItemID) {
    destinationItem = items.find((item) => item.id == destinationItemID)

    if (!destinationItem) {
      return E.left("Destination Item Not Found")
    }

    destinationOrder = destinationItem.order
  }

  const siblingItems = items.filter(
    (item) => item[parentIDKey] == sourceItem[parentIDKey]
  )

  const previousItem = (() => {
    // if the destination order is null, we're moving the collection to the end of the list
    if (destinationOrder == null) {
      return E.right(siblingItems.at(-1))
    }

    const destinationCollectionIndex = siblingItems.findIndex(
      (collection) => collection.id == destinationItemID
    )

    if (destinationCollectionIndex == -1) {
      return E.left("Destination Item Not Found")
    }

    return E.right(siblingItems[destinationCollectionIndex - 1])
  })()

  if (E.isLeft(previousItem)) {
    return previousItem
  } else {
    const newOrder = generateKeyBetween(
      previousItem.right?.order ?? null,
      destinationItem?.order ?? null
    )

    return E.right(
      items.map((item) =>
        item.id == sourceItemID
          ? {
              ...item,
              order: newOrder,
            }
          : item
      )
    )
  }
}
