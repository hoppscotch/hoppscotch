import { describe, it, beforeEach, expect } from "vitest"
import { RequestsService } from "../requests.service"
import { TestContainer } from "dioc/testing"
import { dummyHopp, selectARandomRequest } from "~/helpers/dummyHopp"

interface RequestsServiceTestContext {
  container: TestContainer
}

beforeEach<RequestsServiceTestContext>((context) => {
  context.container = new TestContainer()
})

describe("addRequest", () => {
  it<RequestsServiceTestContext>("should add a request to the store", ({
    container,
  }) => {
    const { setRequests, addRequest, requests } =
      container.bind(RequestsService)

    const { requests: sampleRequests, collections } = dummyHopp()
      .seed(123)
      .rootCollections(1)
      .requestCountMin(3)
      .requestCountMax(3)
      .get()

    setRequests(sampleRequests.slice())

    const id = addRequest({
      name: "Test Request",
      v: "2",
      auth: {
        authActive: true,
        authType: "none",
      },
      body: {
        body: null,
        contentType: null,
      },
      endpoint: "https://example.com/",
      method: "POST",
      headers: [],
      params: [],
      parentCollectionID: collections[0].id,
      preRequestScript: "",
      testScript: "",
    })

    expect(requests.value).toMatchObject([
      ...sampleRequests,
      {
        id,
        name: "Test Request",
        v: "2",
        auth: {
          authActive: true,
          authType: "none",
        },
        body: {
          body: null,
          contentType: null,
        },
        endpoint: "https://example.com/",
        method: "POST",
        headers: [],
        params: [],
        parentCollectionID: collections[0].id,
        preRequestScript: "",
        testScript: "",
        order: "a3",
      },
    ])
  })
})

describe("editRequest", () => {
  it<RequestsServiceTestContext>("should edit a request", ({ container }) => {
    const { setRequests, editRequest, requests } =
      container.bind(RequestsService)

    const { requests: sampleRequests } = dummyHopp()
      .rootCollections(1)
      .requestCountMin(10)
      .requestCountMax(10)
      .get()

    setRequests(sampleRequests.slice())

    const { id } = selectARandomRequest(sampleRequests, 123)

    editRequest(id, {
      name: "Updated Request",
      headers: [
        {
          key: "X-Test-Header",
          value: "TEST-VALUE",
          active: true,
        },
      ],
    })

    const updatedRequest = requests.value.find((item) => item.id == id)

    expect(updatedRequest).toMatchInlineSnapshot(`
          {
            "auth": {
              "authActive": false,
              "authType": "none",
            },
            "body": {
              "body": null,
              "contentType": null,
            },
            "endpoint": "https://fuzzy-sewer.biz/",
            "headers": [
              {
                "active": true,
                "key": "X-Test-Header",
                "value": "TEST-VALUE",
              },
            ],
            "id": "ad09a70a-b67b-41f8-a110-a9fcc89e14b7",
            "method": "DELETE",
            "name": "Updated Request",
            "order": "a6",
            "params": [],
            "parentCollectionID": "318e2aeb-f079-4488-b242-cb158be8365e",
            "preRequestScript": "",
            "testScript": "",
            "v": "1",
          }
        `)
  })
})

describe("removeRequest", () => {
  it<RequestsServiceTestContext>("should remove a request", async ({
    container,
  }) => {
    const requestsService = container.bind(RequestsService)

    const { removeRequest, setRequests, requests } = requestsService

    const { requests: sampleRequests } = dummyHopp()
      .seed(123)
      .rootCollections(2)
      .requestCountMax(3)
      .requestCountMin(3)
      .get()

    setRequests(sampleRequests)

    const { id } = selectARandomRequest(sampleRequests, 123)

    await removeRequest(id)

    const removedRequest = requests.value.find(
      (collection) => collection.id === id
    )

    expect(removedRequest).toBeUndefined()
  })
})

describe("moveRequest", () => {
  it<RequestsServiceTestContext>("should move a request to another collection", async ({
    container,
  }) => {
    const requestsStore = container.bind(RequestsService)

    const { moveRequest, setRequests, requests, orderedRequests } =
      requestsStore

    const { collections, requests: sampleRequests } = dummyHopp()
      .seed(123)
      .rootCollections(3)
      .requestCountMin(5)
      .requestCountMax(5)
      .get()

    setRequests(sampleRequests)

    // Request 1.1
    const sourceRequest = sampleRequests.filter(
      (request) => request.parentCollectionID == collections[1].id
    )[1]

    const sourceRequestCollectionID = sourceRequest.parentCollectionID

    const targetCollectionID = collections[2].id

    // we are going to move Request 1.1 to Collection 2
    moveRequest(sourceRequest.id, targetCollectionID)

    const targetCollectionRequests = orderedRequests.value.filter(
      (req) => req.parentCollectionID == targetCollectionID
    )
    expect(targetCollectionRequests).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://hateful-behalf.com/",
          "headers": [],
          "id": "5875d023-1173-40c4-be60-545fd88a8017",
          "method": "DELETE",
          "name": "Request 2.0",
          "order": "a0",
          "params": [],
          "parentCollectionID": "60627261-4e6c-4ebf-9887-9914576ade41",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://better-mini.org/",
          "headers": [],
          "id": "278f755c-1c93-4379-8b46-e39fbaadf0e4",
          "method": "PUT",
          "name": "Request 2.1",
          "order": "a1",
          "params": [],
          "parentCollectionID": "60627261-4e6c-4ebf-9887-9914576ade41",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://alienated-spite.org/",
          "headers": [],
          "id": "239553f1-93a4-46ab-9465-c0f528728964",
          "method": "PATCH",
          "name": "Request 2.2",
          "order": "a2",
          "params": [],
          "parentCollectionID": "60627261-4e6c-4ebf-9887-9914576ade41",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://thankful-chance.com/",
          "headers": [],
          "id": "a0f27ce0-cb4f-4cdd-ab5f-f6adb57e12ff",
          "method": "DELETE",
          "name": "Request 2.3",
          "order": "a3",
          "params": [],
          "parentCollectionID": "60627261-4e6c-4ebf-9887-9914576ade41",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://violet-kneejerk.name/",
          "headers": [],
          "id": "d9408b10-9153-45ea-b558-b9a3f94a3416",
          "method": "PUT",
          "name": "Request 2.4",
          "order": "a4",
          "params": [],
          "parentCollectionID": "60627261-4e6c-4ebf-9887-9914576ade41",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://blond-poverty.org/",
          "headers": [],
          "id": "613a7e8b-6727-40c9-9941-e99d752e0c29",
          "method": "PATCH",
          "name": "Request 1.1",
          "order": "a5",
          "params": [],
          "parentCollectionID": "60627261-4e6c-4ebf-9887-9914576ade41",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)

    const sourceCollectionRequests = requests.value.filter(
      (req) => req.parentCollectionID == sourceRequestCollectionID
    )

    // the request is no longer in the source collection
    expect(sourceCollectionRequests).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://frank-wrestler.name",
          "headers": [],
          "id": "03e7e831-04de-4390-b71c-7b806b4d62cc",
          "method": "POST",
          "name": "Request 1.0",
          "order": "a0",
          "params": [],
          "parentCollectionID": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://odd-hemisphere.biz",
          "headers": [],
          "id": "3d9ee211-72b6-416d-9861-737c57ecd0a8",
          "method": "DELETE",
          "name": "Request 1.2",
          "order": "a2",
          "params": [],
          "parentCollectionID": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://ripe-knuckle.name/",
          "headers": [],
          "id": "4b46bad0-9a70-4ab6-b7b1-f8110a9fcc89",
          "method": "GET",
          "name": "Request 1.3",
          "order": "a3",
          "params": [],
          "parentCollectionID": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://bright-pad.info",
          "headers": [],
          "id": "f05c3846-5ca6-407c-a295-adb2861f732e",
          "method": "DELETE",
          "name": "Request 1.4",
          "order": "a4",
          "params": [],
          "parentCollectionID": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)
  })

  it<RequestsServiceTestContext>("should move a request to an empty collection", async ({
    container,
  }) => {
    const requestsStore = container.bind(RequestsService)

    const { moveRequest, setRequests, requests, orderedRequests } =
      requestsStore

    const { collections, requests: sampleRequests } = dummyHopp()
      .seed(1234)
      .rootCollections(10)
      .requestCountMin(0)
      .requestCountMax(5)
      .get()

    setRequests(sampleRequests)

    // Request 1.1
    const sourceRequest = sampleRequests.filter(
      (request) => request.parentCollectionID == collections[1].id
    )[1]

    const sourceRequestCollectionID = sourceRequest.parentCollectionID

    const targetCollectionID = (() => {
      const uniqueCollectionIDs = new Set<string>()

      collections.forEach(({ id }) => {
        uniqueCollectionIDs.add(id)
      })

      return Array.from(uniqueCollectionIDs).find(
        (collectionID) =>
          requests.value.filter((req) => req.parentCollectionID == collectionID)
            .length == 0
      )
    })()

    // we are going to move Request 1.1 to An Empty Collection
    moveRequest(sourceRequest.id, targetCollectionID!)

    const targetCollectionRequests = orderedRequests.value.filter(
      (req) => req.parentCollectionID == targetCollectionID
    )
    expect(targetCollectionRequests).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://annual-sensibility.name/",
          "headers": [],
          "id": "03910fd4-45cf-4980-ad9d-aa20c0918dae",
          "method": "PATCH",
          "name": "Request 1.1",
          "order": "a0",
          "params": [],
          "parentCollectionID": "efd523b7-5eee-494b-9582-be2bdbbe7c19",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)

    const sourceCollectionRequests = requests.value.filter(
      (req) => req.parentCollectionID == sourceRequestCollectionID
    )

    // the request is no longer in the source collection
    expect(sourceCollectionRequests).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://hilarious-egg.org/",
          "headers": [],
          "id": "3b6e13a4-cfed-4614-a559-d6e062060c26",
          "method": "PATCH",
          "name": "Request 1.0",
          "order": "a0",
          "params": [],
          "parentCollectionID": "08700c4e-35b9-4e1f-a51e-6a768cc5796d",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://monumental-cobbler.net/",
          "headers": [],
          "id": "d5bab27d-d7af-4588-9a6f-0892d7fba612",
          "method": "PATCH",
          "name": "Request 1.2",
          "order": "a2",
          "params": [],
          "parentCollectionID": "08700c4e-35b9-4e1f-a51e-6a768cc5796d",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)
  })
})

describe("reorderRequests", () => {
  it<RequestsServiceTestContext>("should reorder requests - not first/last request", async ({
    container,
  }) => {
    const { updateRequestOrder, setRequests, orderedRequests } =
      container.bind(RequestsService)

    const { requests: sampleRequests } = dummyHopp()
      .seed(123)
      .rootCollections(1)
      .requestCountMin(5)
      .requestCountMax(5)
      .get()

    setRequests(sampleRequests)

    const { id: sourceRequestID } = sampleRequests[3]
    const { id: destinationRequestID } = sampleRequests[1]

    updateRequestOrder(sourceRequestID, destinationRequestID)

    expect(orderedRequests.value).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://indolent-coat.info/",
          "headers": [],
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "method": "PUT",
          "name": "Request 0.0",
          "order": "a0",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://grounded-grace.com",
          "headers": [],
          "id": "318e2aeb-f079-4488-b242-cb158be8365e",
          "method": "DELETE",
          "name": "Request 0.3",
          "order": "a0V",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://clear-journal.net",
          "headers": [],
          "id": "2614e6ce-bf88-4799-9145-76ade4177f38",
          "method": "PATCH",
          "name": "Request 0.1",
          "order": "a1",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://different-labourer.name/",
          "headers": [],
          "id": "c9486504-56ba-4de4-b87a-49d94a8d215c",
          "method": "POST",
          "name": "Request 0.2",
          "order": "a2",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://funny-inhibitor.name",
          "headers": [],
          "id": "34668b8f-05ac-4090-8be2-46c355d80a81",
          "method": "GET",
          "name": "Request 0.4",
          "order": "a4",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)
  })

  it<RequestsServiceTestContext>("should reorder requests - first request", async ({
    container,
  }) => {
    const { updateRequestOrder, setRequests, orderedRequests } =
      container.bind(RequestsService)

    const { requests: sampleRequests } = dummyHopp()
      .seed(123)
      .rootCollections(1)
      .requestCountMin(5)
      .requestCountMax(5)
      .get()

    setRequests(sampleRequests)

    const { id: sourceRequestID } = sampleRequests[3]
    const { id: destinationRequestID } = sampleRequests[0]

    updateRequestOrder(sourceRequestID, destinationRequestID)

    expect(orderedRequests.value).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://grounded-grace.com",
          "headers": [],
          "id": "318e2aeb-f079-4488-b242-cb158be8365e",
          "method": "DELETE",
          "name": "Request 0.3",
          "order": "Zz",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://indolent-coat.info/",
          "headers": [],
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "method": "PUT",
          "name": "Request 0.0",
          "order": "a0",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://clear-journal.net",
          "headers": [],
          "id": "2614e6ce-bf88-4799-9145-76ade4177f38",
          "method": "PATCH",
          "name": "Request 0.1",
          "order": "a1",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://different-labourer.name/",
          "headers": [],
          "id": "c9486504-56ba-4de4-b87a-49d94a8d215c",
          "method": "POST",
          "name": "Request 0.2",
          "order": "a2",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://funny-inhibitor.name",
          "headers": [],
          "id": "34668b8f-05ac-4090-8be2-46c355d80a81",
          "method": "GET",
          "name": "Request 0.4",
          "order": "a4",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)
  })

  it<RequestsServiceTestContext>("should reorder requests - last request", async ({
    container,
  }) => {
    const { updateRequestOrder, setRequests, orderedRequests } =
      container.bind(RequestsService)

    const { requests: sampleRequests } = dummyHopp()
      .seed(123)
      .rootCollections(1)
      .requestCountMin(5)
      .requestCountMax(5)
      .get()

    setRequests(sampleRequests)

    const { id: sourceRequestID } = sampleRequests[2]

    updateRequestOrder(sourceRequestID, null)

    expect(orderedRequests.value).toMatchInlineSnapshot(`
      [
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://indolent-coat.info/",
          "headers": [],
          "id": "a27218b8-6a4d-47bb-b95b-65a55334fac1",
          "method": "PUT",
          "name": "Request 0.0",
          "order": "a0",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://clear-journal.net",
          "headers": [],
          "id": "2614e6ce-bf88-4799-9145-76ade4177f38",
          "method": "PATCH",
          "name": "Request 0.1",
          "order": "a1",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://grounded-grace.com",
          "headers": [],
          "id": "318e2aeb-f079-4488-b242-cb158be8365e",
          "method": "DELETE",
          "name": "Request 0.3",
          "order": "a3",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://funny-inhibitor.name",
          "headers": [],
          "id": "34668b8f-05ac-4090-8be2-46c355d80a81",
          "method": "GET",
          "name": "Request 0.4",
          "order": "a4",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
        {
          "auth": {
            "authActive": false,
            "authType": "none",
          },
          "body": {
            "body": null,
            "contentType": null,
          },
          "endpoint": "https://different-labourer.name/",
          "headers": [],
          "id": "c9486504-56ba-4de4-b87a-49d94a8d215c",
          "method": "POST",
          "name": "Request 0.2",
          "order": "a5",
          "params": [],
          "parentCollectionID": "bb463b8b-b76c-4f6a-a972-665ab5730b69",
          "preRequestScript": "",
          "testScript": "",
          "v": "1",
        },
      ]
    `)
  })
})
