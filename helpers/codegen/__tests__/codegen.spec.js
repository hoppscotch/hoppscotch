import { codegens } from "../codegen"

const TEST_URL = "https://httpbin.org"
const TEST_PATH_NAME = "/path/to"
const TEST_QUERY_STRING = "?a=b"
const TEST_HTTP_USER = "mockUser"
const TEST_HTTP_PASSWORD = "mockPassword"
const TEST_BEARER_TOKEN = "abcdefghijklmn"
const TEST_RAW_REQUEST_BODY = "foo=bar&baz=qux"
const TEST_RAW_PARAMS_JSON = '{"foo": "bar", "baz": "qux"}'
const TEST_RAW_PARAMS_XML = `<?xml version='1.0' encoding='utf-8'?>
<xml>
  <element foo="bar"></element>
</xml>`
const TEST_HEADERS = [
  { key: "h1", value: "h1v" },
  { key: "h2", value: "h2v" },
]

codegens.forEach((codegen) => {
  describe(`generate request for ${codegen.name}`, () => {
    const testCases = [
      [
        "generate GET request",
        {
          url: TEST_URL,
          pathName: TEST_PATH_NAME,
          queryString: TEST_QUERY_STRING,
          auth: "Basic Auth",
          httpUser: TEST_HTTP_USER,
          httpPassword: TEST_HTTP_PASSWORD,
          method: "GET",
          rawInput: false,
          rawParams: "",
          rawRequestBody: "",
          headers: TEST_HEADERS,
        },
      ],
      [
        "generate POST request for JSON",
        {
          url: TEST_URL,
          pathName: TEST_PATH_NAME,
          queryString: TEST_QUERY_STRING,
          auth: "Bearer Token",
          bearerToken: TEST_BEARER_TOKEN,
          method: "POST",
          rawInput: true,
          rawParams: TEST_RAW_PARAMS_JSON,
          rawRequestBody: "",
          contentType: "application/json",
          headers: TEST_HEADERS,
        },
      ],
      [
        "generate POST request for XML",
        {
          url: TEST_URL,
          pathName: TEST_PATH_NAME,
          queryString: TEST_QUERY_STRING,
          auth: "OAuth 2.0",
          bearerToken: TEST_BEARER_TOKEN,
          method: "POST",
          rawInput: true,
          rawParams: TEST_RAW_PARAMS_XML,
          rawRequestBody: "",
          contentType: "application/xml",
          headers: TEST_HEADERS,
        },
      ],
      [
        "generate PUT request for www-form-urlencoded",
        {
          url: TEST_URL,
          pathName: TEST_PATH_NAME,
          queryString: TEST_QUERY_STRING,
          method: "PUT",
          rawInput: false,
          rawRequestBody: TEST_RAW_REQUEST_BODY,
          contentType: "application/x-www-form-urlencoded",
          headers: [],
        },
      ],
    ]

    test.each(testCases)("%s", (_, context) => {
      const result = codegen.generator(context)
      expect(result).toMatchSnapshot()
    })
  })
})
