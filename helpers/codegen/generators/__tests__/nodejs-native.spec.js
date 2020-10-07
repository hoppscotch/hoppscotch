import { NodeJsNativeCodegen } from "../nodejs-native"
import {
  TEST_BEARER_TOKEN,
  TEST_HEADERS,
  TEST_HTTP_PASSWORD,
  TEST_HTTP_USER,
  TEST_PATH_NAME,
  TEST_QUERY_STRING,
  TEST_RAW_PARAMS_JSON,
  TEST_RAW_PARAMS_XML,
  TEST_RAW_REQUEST_BODY,
  TEST_URL,
} from "../__fixtures__/test-data"

describe("generate request for NodeJs Native", () => {
  test("generate GET request", () => {
    const result = NodeJsNativeCodegen.generator({
      url: TEST_URL,
      pathName: TEST_PATH_NAME,
      queryString: TEST_QUERY_STRING,
      auth: "Basic Auth",
      httpUser: TEST_HTTP_USER,
      httpPassword: TEST_HTTP_PASSWORD,
      method: "GET",
      headers: TEST_HEADERS,
    })
    expect(result).toMatchSnapshot()
  })

  test("generate POST request for JSON", () => {
    const result = NodeJsNativeCodegen.generator({
      url: TEST_URL,
      pathName: TEST_PATH_NAME,
      queryString: TEST_QUERY_STRING,
      auth: "Bearer Token",
      bearerToken: TEST_BEARER_TOKEN,
      method: "POST",
      rawInput: true,
      rawParams: TEST_RAW_PARAMS_JSON,
      contentType: "application/json",
      headers: TEST_HEADERS,
    })
    expect(result).toMatchSnapshot()
  })

  test("generate POST request for XML", () => {
    const result = NodeJsNativeCodegen.generator({
      url: TEST_URL,
      pathName: TEST_PATH_NAME,
      queryString: TEST_QUERY_STRING,
      auth: "OAuth 2.0",
      bearerToken: TEST_BEARER_TOKEN,
      method: "POST",
      rawInput: true,
      rawParams: TEST_RAW_PARAMS_XML,
      contentType: "application/xml",
      headers: TEST_HEADERS,
    })
    expect(result).toMatchSnapshot()
  })

  test("generate PUT request for www-form-urlencoded", () => {
    const result = NodeJsNativeCodegen.generator({
      url: TEST_URL,
      pathName: TEST_PATH_NAME,
      queryString: TEST_QUERY_STRING,
      method: "PUT",
      rawInput: false,
      rawRequestBody: TEST_RAW_REQUEST_BODY,
      contentType: "application/x-www-form-urlencoded",
    })
    expect(result).toMatchSnapshot()
  })
})
