import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import {
  convertHoppToOpenApiCollection,
  generateOpenApiAuth,
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
              authType: "basic",
              username: "testusername",
              password: "testpassword",
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
              "components": Object {
                "securitySchemes": Object {
                  "ApiKeyAuth": Object {
                    "in": "header",
                    "name": "api-key-header-name",
                    "type": "apiKey",
                  },
                  "basicAuth": Object {
                    "scheme": "basic",
                    "type": "http",
                  },
                  "bearerAuth": Object {
                    "scheme": "bearer",
                    "type": "http",
                  },
                },
              },
              "info": Object {
                "title": "Hoppscotch Openapi Export",
                "version": "1.0.0",
              },
              "openapi": "3.0.0",
              "paths": Object {
                "/posts": Object {
                  "get": Object {
                    "description": "1. Create All Todos",
                    "parameters": Array [],
                    "requestBody": Object {
                      "content": Object {},
                    },
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                    "security": Object {},
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
                    "parameters": Array [],
                    "requestBody": Object {
                      "content": Object {},
                    },
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                    "security": Object {},
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

  test("formdata content type", () => {
    const hoppRequestBody: HoppRESTReqBody = {
      contentType: "multipart/form-data",
      body: [
        {
          key: "sample-key",
          value: "sample-value",
          active: true,
          isFile: false,
        },
        {
          key: "sample-file",
          value: [
            new Blob([JSON.stringify({ key1: "value1" })], {
              type: "application/json",
            }),
          ],
          isFile: true,
          active: true,
        },
      ],
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
                "multipart/form-data": Object {
                  "schema": Object {
                    "properties": Object {
                      "sample-file": Object {
                        "format": "binary",
                        "type": "string",
                      },
                      "sample-key": Object {
                        "default": "sample-value",
                        "type": "string",
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

  test("x-www-form-urlencoded content type", () => {
    const hoppRequestBody: HoppRESTReqBody = {
      contentType: "application/x-www-form-urlencoded",
      body: "sampleKey1=sampleValue1&sampleKey2=sampleValue2",
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
                "properties": Object {
                  "sampleKey1": Object {
                    "default": "sampleValue1",
                  },
                  "sampleKey2": Object {
                    "default": "sampleValue2",
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

describe("openapi auth generation", () => {
  test("authtype basic", () => {
    const basicAuth: HoppRESTAuth = {
      authActive: true,
      authType: "basic",
      username: "username",
      password: "password",
    }

    pipe(
      basicAuth,
      generateOpenApiAuth,
      E.fold(
        (error) => {
          throw new Error(`failed to generate openapi auth: ${error}`)
        },
        (security) => {
          expect(security).toMatchInlineSnapshot(`
            Object {
              "basicAuth": Array [],
            }
          `)
        }
      )
    )
  })

  test("authtype api key", () => {
    const apiKeyAuth: HoppRESTAuth = {
      authActive: true,
      authType: "api-key",
      addTo: "header",
      value: "samplekey",
      key: "X-API-KEY",
    }

    pipe(
      apiKeyAuth,
      generateOpenApiAuth,
      E.fold(
        (error) => {
          throw new Error(`failed to generate openapi auth: ${error}`)
        },
        (security) => {
          expect(security).toMatchInlineSnapshot(`
            Object {
              "ApiKeyAuth": Array [],
            }
          `)
        }
      )
    )
  })

  test("authType bearer", () => {
    const apiKeyAuth: HoppRESTAuth = {
      authActive: true,
      authType: "bearer",
      token: "sampletoken",
    }

    pipe(
      apiKeyAuth,
      generateOpenApiAuth,
      E.fold(
        (error) => {
          throw new Error(`failed to generate openapi auth: ${error}`)
        },
        (security) => {
          expect(security).toMatchInlineSnapshot(`
            Object {
              "bearerAuth": Array [],
            }
          `)
        }
      )
    )
  })

  test("authType none", () => {
    const apiKeyAuth: HoppRESTAuth = {
      authActive: true,
      authType: "none",
    }

    pipe(
      apiKeyAuth,
      generateOpenApiAuth,
      E.fold(
        (error) => {
          throw new Error(`failed to generate openapi auth: ${error}`)
        },
        (security) => {
          expect(security).toMatchInlineSnapshot(`Object {}`)
        }
      )
    )
  })
})
