import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { HoppRESTRequest, RESTReqSchemaVersion } from "@hoppscotch/data"
import { createNewRootCollection } from "~/helpers/backend/mutations/TeamCollection"
import { createRequestInCollection } from "~/helpers/backend/mutations/TeamRequest"

/**
 * Get example REST requests for mock server collection
 */
export function getExampleMockRequests(): HoppRESTRequest[] {
  const petBody = JSON.stringify(
    {
      id: 1,
      category: {
        id: 1,
        name: "string",
      },
      name: "doggie",
      photoUrls: ["string"],
      tags: [],
      status: "available",
    },
    null,
    2
  )

  const oauthAuth = {
    authType: "oauth-2" as const,
    authActive: true,
    grantTypeInfo: {
      authEndpoint: "<<mockUrl>>/oauth/authorize",
      clientID: "",
      grantType: "IMPLICIT" as const,
      scopes: "write:pets read:pets",
      token: "",
      authRequestParams: [],
      refreshRequestParams: [],
    },
    addTo: "HEADERS" as const,
  }

  const requests: HoppRESTRequest[] = [
    // addPet request
    {
      v: RESTReqSchemaVersion,
      name: "addPet",
      method: "POST",
      endpoint: "<<mockUrl>>/v2/pet",
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: "application/json",
        body: petBody,
      },
      auth: oauthAuth,
      requestVariables: [],
      responses: {},
    },
    // updatePet request
    {
      v: RESTReqSchemaVersion,
      name: "updatePet",
      method: "PUT",
      endpoint: "<<mockUrl>>/v2/pet",
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: "application/json",
        body: petBody,
      },
      auth: oauthAuth,
      requestVariables: [],
      responses: {},
    },
    // findByStatus request
    {
      v: RESTReqSchemaVersion,
      name: "findByStatus",
      method: "GET",
      endpoint: "<<mockUrl>>/v2/pet/findByStatus",
      params: [
        {
          key: "status",
          value: "available",
          active: true,
          description: "",
        },
      ],
      headers: [],
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: null,
        body: null,
      },
      auth: oauthAuth,
      requestVariables: [],
      responses: {},
    },
    // getPetById request
    {
      v: RESTReqSchemaVersion,
      name: "getPetById",
      method: "GET",
      endpoint: "<<mockUrl>>/v2/pet/1",
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: null,
        body: null,
      },
      auth: {
        authType: "api-key",
        authActive: true,
        key: "api_key",
        value: "",
        addTo: "HEADERS",
      },
      requestVariables: [],
      responses: {},
    },
    // updatePetWithForm request
    {
      v: RESTReqSchemaVersion,
      name: "updatePetWithForm",
      method: "POST",
      endpoint: "<<mockUrl>>/v2/pet/1",
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: "name=doggie&status=available",
      },
      auth: oauthAuth,
      requestVariables: [],
      responses: {},
    },
    // deletePet request
    {
      v: RESTReqSchemaVersion,
      name: "deletePet",
      method: "DELETE",
      endpoint: "<<mockUrl>>/v2/pet/1",
      params: [],
      headers: [
        {
          key: "api_key",
          value: "",
          active: true,
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: null,
        body: null,
      },
      auth: oauthAuth,
      requestVariables: [],
      responses: {},
    },
  ]

  return requests
}

/**
 * Create a mock collection for team workspace
 */
export async function createMockCollectionForTeam(
  teamID: string,
  collectionName: string
): Promise<E.Either<string, { id: string; name: string }>> {
  // Create the root collection
  const collectionResult = await pipe(
    createNewRootCollection(collectionName, teamID),
    TE.match(
      (error) => E.left(`Failed to create collection: ${error}`),
      (collection) => E.right(collection)
    )
  )()

  if (E.isLeft(collectionResult)) {
    return collectionResult
  }

  const collectionID = collectionResult.right.createRootCollection.id

  // Create requests in the collection
  const requests = getExampleMockRequests()

  for (const request of requests) {
    const requestResult = await pipe(
      createRequestInCollection(collectionID, {
        request: JSON.stringify(request),
        teamID,
        title: request.name,
      }),
      TE.match(
        (error) => E.left(`Failed to create request: ${error}`),
        (req) => E.right(req)
      )
    )()

    if (E.isLeft(requestResult)) {
      // Log error but continue with other requests
      console.error(
        "Failed to create request:",
        request.name,
        requestResult.left
      )
    }
  }

  return E.right({
    id: collectionID,
    name: collectionName,
  })
}

/**
 * Create a mock collection for personal workspace
 * Uses the hoppscotch/data makeCollection to create a local collection
 */
export async function createMockCollectionForPersonal(
  collectionName: string
): Promise<E.Either<string, { id: string; name: string }>> {
  const { makeCollection } = await import("@hoppscotch/data")
  const { appendRESTCollections } = await import("~/newstore/collections")

  // Create the collection structure
  const requests = getExampleMockRequests()

  const collection = makeCollection({
    name: collectionName,
    folders: [],
    requests,
    auth: {
      authType: "inherit",
      authActive: true,
    },
    headers: [],
    variables: [],
  })

  // Append to local storage
  appendRESTCollections([collection])

  // Wait a bit to ensure the collection is registered in the store
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Return the collection info (generate ID if not present)
  const collectionID =
    collection.id || collection._ref_id || Date.now().toString()

  return E.right({
    id: collectionID,
    name: collectionName,
  })
}
