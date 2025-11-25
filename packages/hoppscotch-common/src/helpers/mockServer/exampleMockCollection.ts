import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import {
  HoppRESTRequest,
  RESTReqSchemaVersion,
  makeCollection,
} from "@hoppscotch/data"
import { createNewRootCollection } from "~/helpers/backend/mutations/TeamCollection"
import { createRequestInCollection } from "~/helpers/backend/mutations/TeamRequest"
import { runMutation } from "~/helpers/backend/GQLClient"
import {
  CreateRestRootUserCollectionDocument,
  CreateRestRootUserCollectionMutation,
  CreateRestRootUserCollectionMutationVariables,
  CreateRestUserRequestDocument,
  CreateRestUserRequestMutation,
  CreateRestUserRequestMutationVariables,
} from "~/helpers/backend/graphql"
import { addRESTCollection } from "~/newstore/collections"

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
 * Uses backend GraphQL mutations to create the collection with proper backend ID
 */
export async function createMockCollectionForPersonal(
  collectionName: string
): Promise<E.Either<string, { id: string; name: string }>> {
  // Prepare collection data
  const data = {
    auth: {
      authType: "inherit" as const,
      authActive: true,
    },
    headers: [],
    variables: [],
  }

  // Create the root collection using GraphQL mutation
  const collectionResult = await pipe(
    runMutation<
      CreateRestRootUserCollectionMutation,
      CreateRestRootUserCollectionMutationVariables,
      ""
    >(CreateRestRootUserCollectionDocument, {
      title: collectionName,
      data: JSON.stringify(data),
    }),
    TE.match(
      (error) => E.left(`Failed to create collection: ${error}`),
      (response) => E.right(response)
    )
  )()

  if (E.isLeft(collectionResult)) {
    return collectionResult
  }

  // Extract the collection ID from the response
  const collectionID = collectionResult.right.createRESTRootUserCollection.id

  // Create requests in the collection using GraphQL mutation
  const requests = getExampleMockRequests()
  const createdRequests: HoppRESTRequest[] = []

  for (const request of requests) {
    const requestResult = await pipe(
      runMutation<
        CreateRestUserRequestMutation,
        CreateRestUserRequestMutationVariables,
        ""
      >(CreateRestUserRequestDocument, {
        collectionID,
        title: request.name,
        request: JSON.stringify(request),
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
    } else {
      // Add the request ID to the created request
      const createdRequest = {
        ...request,
        id: requestResult.right.createRESTUserRequest.id,
      }
      createdRequests.push(createdRequest)
    }
  }

  // Create a HoppCollection object and add it to the store immediately
  const collection = makeCollection({
    name: collectionName,
    folders: [],
    requests: createdRequests,
    auth: data.auth,
    headers: data.headers,
    variables: data.variables,
  })

  // Add the backend ID to the collection
  collection.id = collectionID

  // Add the collection to the store so it's visible immediately
  addRESTCollection(collection)

  return E.right({
    id: collectionID,
    name: collectionName,
  })
}
