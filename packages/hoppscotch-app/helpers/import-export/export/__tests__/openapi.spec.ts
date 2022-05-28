import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { convertHoppToOpenApiCollection } from "../openapi"

describe("hopp to openapi converter", () => {
  test("multiple hoppscotch collections", () => {
    const collection: HoppCollection<HoppRESTRequest>[] = [
      {
        v: 1,
        name: "JSONPlaceholder",
        folders: [],
        requests: [
          {
            v: "1",
            endpoint: "https://jsonplaceholder.typicode.com/posts",
            name: "1. Create A post",
            params: [],
            headers: [],
            method: "POST",
            auth: {
              authType: "none",
              authActive: true,
            },
            preRequestScript: "",
            testScript: "",
            body: {
              contentType: "application/json",
              body: '{\n  "userId": 1,\n  "id": 1,\n  "title": "Sample Title #1",\n  "body": "Sample Body #1"\n}',
            },
          },
          {
            v: "1",
            endpoint: "https://jsonplaceholder.typicode.com/posts",
            name: "2. Get details about a post",
            params: [],
            headers: [],
            method: "POST",
            auth: {
              authType: "none",
              authActive: true,
            },
            preRequestScript: "",
            testScript: "",
            body: {
              contentType: "application/json",
              body: '{\n  "userId": 1,\n  "id": 1,\n  "title": "Sample Title #1",\n  "body": "Sample Body #1"\n}',
            },
          },
          {
            v: "1",
            endpoint: "https://jsonplaceholder.typicode.com/posts/1",
            name: "3. Delete a post",
            params: [],
            headers: [],
            method: "DELETE",
            auth: {
              authType: "none",
              authActive: true,
            },
            preRequestScript: "",
            testScript: "",
            body: {
              contentType: "application/json",
              body: "",
            },
          },
        ],
      },
      {
        v: 1,
        name: "Todos",
        folders: [],
        requests: [
          {
            v: "1",
            endpoint: "https://jsonplaceholder.typicode.com/posts",
            name: "1. Create All Todos",
            params: [],
            headers: [],
            method: "GET",
            auth: {
              authType: "none",
              authActive: true,
            },
            preRequestScript: "",
            testScript: "",
            body: {
              contentType: null,
              body: null,
            },
          },
        ],
      },
    ]

    pipe(
      collection,
      convertHoppToOpenApiCollection,
      E.fold(
        (error) => {
          throw new Error(`Failed to generate openapi document: ${error}`)
        },
        (openApiDocument) => {
          expect(openApiDocument).toMatchInlineSnapshot(`
            Object {
              "info": Object {
                "title": "Hoppscotch Openapi Export",
                "version": "1.0.0",
              },
              "openapi": "3.0.0",
              "paths": Object {
                "/posts": Object {
                  "get": Object {
                    "description": "1. Create All Todos",
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                  },
                  "servers": Array [
                    Object {
                      "url": "jsonplaceholder.typicode.com",
                    },
                  ],
                },
                "/posts/1": Object {
                  "delete": Object {
                    "description": "3. Delete a post",
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                  },
                  "servers": Array [
                    Object {
                      "url": "jsonplaceholder.typicode.com",
                    },
                  ],
                },
              },
            }
          `)
        }
      )
    )
  })
})
