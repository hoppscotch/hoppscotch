import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
  makeRESTRequest,
} from "@hoppscotch/data"
import { uniqueID } from "~/helpers/utils/uniqueID"

const MOCK_URL_VAR = "<<mockUrl>>"

/**
 * Returns a JSON string of the Pet Store example collection for import
 * @returns JSON string representation of the collection
 */
export function getPetStoreExampleJSON(): string {
  const collection = createExamplePetStoreCollection()
  return JSON.stringify(collection)
}

/**
 * Creates an example Pet Store collection with 4 requests (GET, POST, PUT, DELETE)
 * @param collectionName The name for the collection
 * @returns A HoppCollection object with example pet store requests
 */
export function createExamplePetStoreCollection(
  collectionName: string = "Pet Store Mock Server"
): HoppCollection {
  const requests: HoppRESTRequest[] = [
    // GET - List all pets
    makeRESTRequest({
      id: uniqueID(),
      name: "Get All Pets",
      method: "GET",
      endpoint: `${MOCK_URL_VAR}/pets`,
      params: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: null,
        body: null,
      },
      requestVariables: [],
      responses: {
        [uniqueID()]: {
          status: 200,
          body: JSON.stringify(
            [
              {
                id: 1,
                name: "Buddy",
                species: "Dog",
                breed: "Golden Retriever",
                age: 3,
                status: "available",
              },
              {
                id: 2,
                name: "Whiskers",
                species: "Cat",
                breed: "Siamese",
                age: 2,
                status: "available",
              },
              {
                id: 3,
                name: "Charlie",
                species: "Dog",
                breed: "Beagle",
                age: 4,
                status: "adopted",
              },
            ],
            null,
            2
          ),
          headers: [
            {
              key: "Content-Type",
              value: "application/json",
              active: true,
              description: "",
            },
          ],
        },
      },
    }),

    // GET - Get a single pet by ID
    makeRESTRequest({
      id: uniqueID(),
      name: "Get Pet by ID",
      method: "GET",
      endpoint: `${MOCK_URL_VAR}/pets/1`,
      params: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: null,
        body: null,
      },
      requestVariables: [],
      responses: {
        [uniqueID()]: {
          status: 200,
          body: JSON.stringify(
            {
              id: 1,
              name: "Buddy",
              species: "Dog",
              breed: "Golden Retriever",
              age: 3,
              status: "available",
              description: "Friendly and energetic golden retriever",
              vaccinated: true,
              neutered: true,
            },
            null,
            2
          ),
          headers: [
            {
              key: "Content-Type",
              value: "application/json",
              active: true,
              description: "",
            },
          ],
        },
      },
    }),

    // POST - Create a new pet
    makeRESTRequest({
      id: uniqueID(),
      name: "Create New Pet",
      method: "POST",
      endpoint: `${MOCK_URL_VAR}/pets`,
      params: [],
      headers: [
        {
          key: "Content-Type",
          value: "application/json",
          active: true,
          description: "",
        },
      ],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: "application/json",
        body: JSON.stringify(
          {
            name: "Max",
            species: "Dog",
            breed: "Labrador",
            age: 2,
            status: "available",
            description: "Playful labrador looking for a home",
            vaccinated: true,
            neutered: false,
          },
          null,
          2
        ),
      },
      requestVariables: [],
      responses: {
        [uniqueID()]: {
          status: 201,
          body: JSON.stringify(
            {
              id: 4,
              name: "Max",
              species: "Dog",
              breed: "Labrador",
              age: 2,
              status: "available",
              description: "Playful labrador looking for a home",
              vaccinated: true,
              neutered: false,
              createdAt: new Date().toISOString(),
            },
            null,
            2
          ),
          headers: [
            {
              key: "Content-Type",
              value: "application/json",
              active: true,
              description: "",
            },
            {
              key: "Location",
              value: "/pets/4",
              active: true,
              description: "",
            },
          ],
        },
      },
    }),

    // PUT - Update an existing pet
    makeRESTRequest({
      id: uniqueID(),
      name: "Update Pet",
      method: "PUT",
      endpoint: `${MOCK_URL_VAR}/pets/1`,
      params: [],
      headers: [
        {
          key: "Content-Type",
          value: "application/json",
          active: true,
          description: "",
        },
      ],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: "application/json",
        body: JSON.stringify(
          {
            name: "Buddy",
            species: "Dog",
            breed: "Golden Retriever",
            age: 4,
            status: "adopted",
            description: "Friendly golden retriever - Now adopted!",
            vaccinated: true,
            neutered: true,
          },
          null,
          2
        ),
      },
      requestVariables: [],
      responses: {
        [uniqueID()]: {
          status: 200,
          body: JSON.stringify(
            {
              id: 1,
              name: "Buddy",
              species: "Dog",
              breed: "Golden Retriever",
              age: 4,
              status: "adopted",
              description: "Friendly golden retriever - Now adopted!",
              vaccinated: true,
              neutered: true,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          headers: [
            {
              key: "Content-Type",
              value: "application/json",
              active: true,
              description: "",
            },
          ],
        },
      },
    }),

    // DELETE - Delete a pet
    makeRESTRequest({
      id: uniqueID(),
      name: "Delete Pet",
      method: "DELETE",
      endpoint: `${MOCK_URL_VAR}/pets/3`,
      params: [],
      headers: [],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      preRequestScript: "",
      testScript: "",
      body: {
        contentType: null,
        body: null,
      },
      requestVariables: [],
      responses: {
        [uniqueID()]: {
          status: 204,
          body: "",
          headers: [],
        },
      },
    }),
  ]

  return makeCollection({
    name: collectionName,
    folders: [],
    requests,
    auth: {
      authType: "inherit",
      authActive: true,
    },
    headers: [],
  })
}
