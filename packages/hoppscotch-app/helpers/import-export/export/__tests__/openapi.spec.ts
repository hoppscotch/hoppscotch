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
import { getCombinedEnvVariables } from "~/helpers/preRequest"

jest.mock("~/helpers/preRequest")

describe("hopp to openapi converter", () => {
  test("multiple hoppscotch collections", () => {
    // an example convering folders,params,headers,auth, multiple collections
    // not all cases are covered because they were tested individually

    const collection: HoppCollection<HoppRESTRequest>[] = [
      {
        v: 1,
        folders: [
          {
            v: 1,
            folders: [],
            name: "Hoppscotch OpenAPI Conversion Sample Folder",
            requests: [
              {
                v: "2",
                name: "Sample Request 3",
                endpoint: "https://sampleurl.com/endpoint3",
                params: [
                  {
                    key: "sampleparam1",
                    value: "samplevalue1",
                    active: true,
                  },
                  {
                    key: "sampleparam2",
                    value: "samplevalue2",
                    active: true,
                  },
                ],
                method: "POST",
                body: {
                  contentType: "application/json",
                  body: JSON.stringify({
                    key1: "value1",
                    key2: {
                      key3: "value3",
                      key4: "value4",
                      key5: "value5",
                      key6: {
                        key7: "value7",
                      },
                    },
                  }),
                },
                preRequestScript: "",
                testScript: "",
                headers: [
                  {
                    active: true,
                    key: "X-SAMPLE-HEADER",
                    value: "sample_header_value",
                  },
                  {
                    active: true,
                    key: "X-ANOTHER-SAMPLE-HEADER",
                    value: "another_sample_header",
                  },
                ],
                auth: {
                  authActive: true,
                  authType: "bearer",
                  token: "sampletoken",
                },
              },
            ],
          },
        ],
        name: "Hoppscotch OpenAPI Conversion Sample",
        requests: [
          {
            v: "2",
            name: "Sample Request 1",
            endpoint: "https://sampleurl.com/endpoint4",
            params: [
              {
                key: "sampleparam1",
                value: "samplevalue1",
                active: true,
              },
              {
                key: "sampleparam2",
                value: "samplevalue2",
                active: true,
              },
            ],
            method: "POST",
            body: {
              contentType: "application/json",
              body: JSON.stringify({
                key1: "value1",
                key2: {
                  key3: "value3",
                  key4: "value4",
                  key5: "value5",
                  key6: {
                    key7: "value7",
                  },
                },
              }),
            },
            preRequestScript: "",
            testScript: "",
            headers: [
              {
                active: true,
                key: "X-SAMPLE-HEADER",
                value: "sample_header_value",
              },
              {
                active: true,
                key: "X-ANOTHER-SAMPLE-HEADER",
                value: "another_sample_header",
              },
            ],
            auth: {
              authActive: true,
              authType: "bearer",
              token: "sampletoken",
            },
          },
          {
            v: "2",
            name: "Sample Request 2",
            endpoint: "<<baseUrl>>/endpoint2",
            params: [
              {
                key: "sampleparam1",
                value: "<<currentValue>>",
                active: true,
              },
              {
                key: "sampleparam2",
                value: "samplevalue2",
                active: true,
              },
            ],
            method: "POST",
            body: {
              contentType: "application/x-www-form-urlencoded",
              body: "sampleurlparam1=<<currentUrlParamValue1>>&sampleurlparam2=sampleurlvalue2",
            },
            preRequestScript: "",
            testScript: "",
            headers: [
              {
                active: true,
                key: "X-SAMPLE-HEADER",
                value: "sample_header_value",
              },
              {
                active: true,
                key: "X-ANOTHER-SAMPLE-HEADER",
                value: "another_sample_header",
              },
            ],
            auth: {
              authActive: true,
              authType: "api-key",
              addTo: "header",
              key: "X-API-KEY",
              value: "sampleapikey",
            },
          },
        ],
      },
      {
        v: 1,
        folders: [],
        name: "Hoppscotch OpenAPI Conversion Sample",
        requests: [
          {
            v: "2",
            name: "Sample Request 4",
            endpoint: "https://sampleurl.com/endpoint1",
            params: [],
            method: "POST",
            body: {
              contentType: null,
              body: null,
            },
            preRequestScript: "",
            testScript: "",
            headers: [],
            auth: {
              authActive: true,
              authType: "none",
            },
          },
        ],
      },
    ]

    const mocked = getCombinedEnvVariables as jest.MockedFunction<
      typeof getCombinedEnvVariables
    >

    mocked.mockReturnValue({
      global: [
        {
          key: "baseUrl",
          value: "https://sampleurl.com",
        },
      ],
      selected: [
        {
          key: "currentValue",
          value: "samplevalue1",
        },
        {
          key: "currentUrlParamValue1",
          value: "sampleurlvalue1",
        },
      ],
    })

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
                "/endpoint1": Object {
                  "post": Object {
                    "description": "Sample Request 4",
                    "parameters": Array [],
                    "requestBody": Object {
                      "content": Object {},
                    },
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                    "security": Array [
                      Object {},
                    ],
                  },
                  "servers": Array [
                    Object {
                      "url": "sampleurl.com",
                    },
                  ],
                },
                "/endpoint2": Object {
                  "post": Object {
                    "description": "Sample Request 2",
                    "parameters": Array [
                      Object {
                        "in": "header",
                        "name": "content-type",
                        "schema": Object {
                          "default": "application/x-www-form-urlencoded",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "X-SAMPLE-HEADER",
                        "schema": Object {
                          "default": "sample_header_value",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "X-ANOTHER-SAMPLE-HEADER",
                        "schema": Object {
                          "default": "another_sample_header",
                        },
                      },
                      Object {
                        "in": "query",
                        "name": "sampleparam1",
                        "schema": Object {
                          "default": "samplevalue1",
                        },
                      },
                      Object {
                        "in": "query",
                        "name": "sampleparam2",
                        "schema": Object {
                          "default": "samplevalue2",
                        },
                      },
                    ],
                    "requestBody": Object {
                      "content": Object {
                        "application/x-www-form-urlencoded": Object {
                          "schema": Object {
                            "properties": Object {
                              "sampleurlparam1": Object {
                                "default": "sampleurlvalue1",
                              },
                              "sampleurlparam2": Object {
                                "default": "sampleurlvalue2",
                              },
                            },
                          },
                        },
                      },
                    },
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                    "security": Array [
                      Object {
                        "ApiKeyAuth": Array [],
                      },
                    ],
                  },
                  "servers": Array [
                    Object {
                      "url": "sampleurl.com",
                    },
                  ],
                },
                "/endpoint3": Object {
                  "post": Object {
                    "description": "Sample Request 3",
                    "parameters": Array [
                      Object {
                        "in": "header",
                        "name": "Authorization",
                        "schema": Object {
                          "default": "Bearer sampletoken",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "content-type",
                        "schema": Object {
                          "default": "application/json",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "X-SAMPLE-HEADER",
                        "schema": Object {
                          "default": "sample_header_value",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "X-ANOTHER-SAMPLE-HEADER",
                        "schema": Object {
                          "default": "another_sample_header",
                        },
                      },
                      Object {
                        "in": "query",
                        "name": "sampleparam1",
                        "schema": Object {
                          "default": "samplevalue1",
                        },
                      },
                      Object {
                        "in": "query",
                        "name": "sampleparam2",
                        "schema": Object {
                          "default": "samplevalue2",
                        },
                      },
                    ],
                    "requestBody": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "properties": Object {
                              "key1": Object {
                                "default": "value1",
                              },
                              "key2": Object {
                                "properties": Object {
                                  "key3": Object {
                                    "default": "value3",
                                  },
                                  "key4": Object {
                                    "default": "value4",
                                  },
                                  "key5": Object {
                                    "default": "value5",
                                  },
                                  "key6": Object {
                                    "properties": Object {
                                      "key7": Object {
                                        "default": "value7",
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                    "security": Array [
                      Object {
                        "bearerAuth": Array [],
                      },
                    ],
                  },
                  "servers": Array [
                    Object {
                      "url": "sampleurl.com",
                    },
                  ],
                },
                "/endpoint4": Object {
                  "post": Object {
                    "description": "Sample Request 1",
                    "parameters": Array [
                      Object {
                        "in": "header",
                        "name": "Authorization",
                        "schema": Object {
                          "default": "Bearer sampletoken",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "content-type",
                        "schema": Object {
                          "default": "application/json",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "X-SAMPLE-HEADER",
                        "schema": Object {
                          "default": "sample_header_value",
                        },
                      },
                      Object {
                        "in": "header",
                        "name": "X-ANOTHER-SAMPLE-HEADER",
                        "schema": Object {
                          "default": "another_sample_header",
                        },
                      },
                      Object {
                        "in": "query",
                        "name": "sampleparam1",
                        "schema": Object {
                          "default": "samplevalue1",
                        },
                      },
                      Object {
                        "in": "query",
                        "name": "sampleparam2",
                        "schema": Object {
                          "default": "samplevalue2",
                        },
                      },
                    ],
                    "requestBody": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "properties": Object {
                              "key1": Object {
                                "default": "value1",
                              },
                              "key2": Object {
                                "properties": Object {
                                  "key3": Object {
                                    "default": "value3",
                                  },
                                  "key4": Object {
                                    "default": "value4",
                                  },
                                  "key5": Object {
                                    "default": "value5",
                                  },
                                  "key6": Object {
                                    "properties": Object {
                                      "key7": Object {
                                        "default": "value7",
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    "responses": Object {
                      "200": Object {
                        "description": "",
                      },
                    },
                    "security": Array [
                      Object {
                        "bearerAuth": Array [],
                      },
                    ],
                  },
                  "servers": Array [
                    Object {
                      "url": "sampleurl.com",
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
                "application/x-www-form-urlencoded": Object {
                  "schema": Object {
                    "properties": Object {
                      "sampleKey1": Object {
                        "default": "sampleValue1",
                      },
                      "sampleKey2": Object {
                        "default": "sampleValue2",
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
