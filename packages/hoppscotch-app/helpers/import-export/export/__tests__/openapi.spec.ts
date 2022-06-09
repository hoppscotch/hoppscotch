import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import {
  HoppCollection,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import {
  convertHoppToOpenApiCollection,
  generateOpenApiRequestBody,
} from "../openapi"

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

describe("openapi body generation", () => {
  test("json content type", () => {
    const hoppRequestBody: HoppRESTReqBody = {
      contentType: "application/json",
      body: JSON.stringify({
        prop1: "value 1",
        prop2: "value 2",
        prop3: {
          prop4: {
            prop5: ["value 4", "value 5"],
          },
          prop6: "value 6",
        },
      }),
    }

    pipe(
      hoppRequestBody,
      generateOpenApiRequestBody,
      E.fold(
        (error) => {
          throw new Error(`failed to generate open api body ${error}`)
        },
        (openapiRequestBody) => {
          expect(openapiRequestBody).toMatchInlineSnapshot(`
            Object {
              "content": Object {
                "application/json": Object {
                  "schema": Object {
                    "properties": Object {
                      "prop1": Object {
                        "default": "value 1",
                      },
                      "prop2": Object {
                        "default": "value 2",
                      },
                      "prop3": Object {
                        "properties": Object {
                          "prop4": Object {
                            "properties": Object {
                              "prop5": Object {
                                "default": Array [
                                  "value 4",
                                  "value 5",
                                ],
                              },
                            },
                          },
                          "prop6": Object {
                            "default": "value 6",
                          },
                        },
                      },
                    },
                  },
                },
              },
            }
          `)
        }
      )
    )
  })

  test("empty content type", () => {
    const hoppRequestBody: HoppRESTReqBody = {
      body: null,
      contentType: null,
    }

    pipe(
      hoppRequestBody,
      generateOpenApiRequestBody,
      E.fold(
        (error) => {
          throw new Error(`failed to generate openapi body ${error}`)
        },
        (openapiBody) => {
          expect(openapiBody).toMatchInlineSnapshot(`
            Object {
              "content": Object {},
            }
          `)
        }
      )
    )
  })

  test("json content types other than application/json", () => {
    const hoppRequestBody: HoppRESTReqBody = {
      contentType: "application/hal+json",
      body: JSON.stringify({
        prop1: "value 1",
        prop2: "value 2",
        prop3: {
          prop4: {
            prop5: ["value 4", "value 5"],
          },
          prop6: "value 6",
        },
      }),
    }

    pipe(
      hoppRequestBody,
      generateOpenApiRequestBody,
      E.fold(
        (error) => {
          throw new Error(`failed to generate open api body ${error}`)
        },
        (openapiRequestBody) => {
          expect(openapiRequestBody).toMatchInlineSnapshot(`
            Object {
              "content": Object {
                "application/hal+json": Object {
                  "schema": Object {
                    "properties": Object {
                      "prop1": Object {
                        "default": "value 1",
                      },
                      "prop2": Object {
                        "default": "value 2",
                      },
                      "prop3": Object {
                        "properties": Object {
                          "prop4": Object {
                            "properties": Object {
                              "prop5": Object {
                                "default": Array [
                                  "value 4",
                                  "value 5",
                                ],
                              },
                            },
                          },
                          "prop6": Object {
                            "default": "value 6",
                          },
                        },
                      },
                    },
                  },
                },
              },
            }
          `)
        }
      )
    )
  })

  test("valid content types other than json and formdata are treated as text/plain", () => {
    const hoppRequestBody: HoppRESTReqBody = {
      contentType: "application/xml",
      body: `<?xml version="1.0" encoding="UTF-8" ?>
      <root>
        <title>sample title</title>
        <description>sample description</description>
      </root>`,
    }

    pipe(
      hoppRequestBody,
      generateOpenApiRequestBody,
      E.fold(
        (error) => {
          throw new Error(`failed to generate open api body ${error}`)
        },
        (openapiRequestBody) => {
          expect(openapiRequestBody).toMatchInlineSnapshot(`
            Object {
              "content": Object {
                "text/plain": Object {
                  "schema": Object {
                    "default": <?xml version="1.0" encoding="UTF-8" ?>
            <root>
              <title>sample title</title>
              <description>sample description</description>
            </root>,
                    "type": "string",
                  },
                },
              },
            }
          `)
        }
      )
    )
  })
})
