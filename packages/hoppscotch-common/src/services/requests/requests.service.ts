import { Service } from "dioc"
import { UpdatedHoppRESTRequest } from "../collections.service"
import { computed, ref } from "vue"
import { v4 as uuidV4 } from "uuid"
import { generateKeyBetween } from "fractional-indexing"
import { reorderItems } from "../collections/collections.service"

import * as E from "fp-ts/Either"

export class RequestsService extends Service {
  public static ID = "RequestsService"

  public requests = ref<UpdatedHoppRESTRequest[]>([])

  public orderedRequests = computed(() =>
    this.requests.value.sort((req1, req2) => {
      if (req1.order < req2.order) {
        return -1
      }

      if (req1.order > req2.order) {
        return 1
      }

      return 0
    })
  )

  public setRequests = (requests: UpdatedHoppRESTRequest[]) => {
    this.requests.value = requests
  }

  // tested
  // in previous implementations we called this saveRequestAs
  public addRequest = (
    request: Omit<UpdatedHoppRESTRequest, "id" | "order">
  ) => {
    const id = uuidV4()

    let lastRequestOrder: string | null

    const requestsLength = this.orderedRequests.value.length

    if (requestsLength > 0) {
      const lastRequest = this.orderedRequests.value[requestsLength - 1]

      lastRequestOrder = lastRequest.order
    } else {
      lastRequestOrder = null
    }

    this.requests.value.push({
      id,
      ...request,
      order: generateKeyBetween(lastRequestOrder, null),
    })

    return id
  }

  // tested
  public editRequest = (
    requestID: string,
    updatedRequest: Partial<UpdatedHoppRESTRequest>
  ) => {
    this.requests.value = this.requests.value.map((request) =>
      request.id === requestID ? { ...request, ...updatedRequest } : request
    )
  }

  // tested
  public removeRequest = (requestID: string) => {
    this.requests.value = this.requests.value.filter(
      (request) => request.id != requestID
    )
  }

  // tested
  public moveRequest = (requestID: string, destinationCollectionID: string) => {
    // find the destination collection
    const requestsInDestinationCollection = this.requests.value
      .filter(
        (request) => request.parentCollectionID == destinationCollectionID
      )
      .sort()

    const requestsLength = requestsInDestinationCollection.length

    const lastRequest = requestsLength
      ? requestsInDestinationCollection[requestsLength - 1]
      : null

    const order: string = generateKeyBetween(lastRequest?.order ?? null, null)

    this.requests.value = this.requests.value.map((request) =>
      request.id == requestID
        ? {
            ...request,
            order,
            parentCollectionID: destinationCollectionID,
          }
        : request
    )
  }

  // tested
  public updateRequestOrder = (
    sourceRequestID: string,
    destinationRequestID: string | null
  ) => {
    const reorder = reorderItems(
      sourceRequestID,
      destinationRequestID,
      this.orderedRequests.value,
      "parentCollectionID"
    )

    if (E.isRight(reorder)) {
      this.requests.value = reorder.right
    } else {
      console.warn("Error while reordering requests", reorder.left)
    }
  }
}
