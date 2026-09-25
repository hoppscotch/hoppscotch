// @ts-check
// ^^^ Enables Type Checking by the TypeScript compiler

import { describe, expect, test } from "vitest"
import { makeRESTRequest, rawKeyValueEntriesToString } from "@hoppscotch/data"
import { parseCurlToHoppRESTReq } from ".."
import { preProcessCurlCommand } from "../sub_helpers/preproc"

const samples = [
  {
    command: `
      curl --request GET \
      --url https://echo.hoppscotch.io/ \
      --header 'content-type: application/x-www-form-urlencoded' \
      --data a=b \
      --data c=d
    `,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: rawKeyValueEntriesToString([
          {
            active: true,
            key: "a",
            value: "b",
          },
          {
            active: true,
            key: "c",
            value: "d",
          },
        ]),
      },
      headers: [],
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `
      curl 'http://avs:def@127.0.0.1:8000/api/admin/crm/brand/4'
        -X PUT
        -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0'
        -H 'Accept: application/json, text/plain, */*'
        -H 'Accept-Language: en'
        --compressed
        -H 'Content-Type: application/hal+json;charset=utf-8'
        -H 'Origin: http://localhost:3012'
        -H 'Connection: keep-alive'
        -H 'Referer: http://localhost:3012/crm/company/4'
        --data-raw '{"id":4,"crm_company_id":4,"industry_primary_id":2,"industry_head_id":2,"industry_body_id":2,"code":"01","barcode":"222010101","summary":"Healt-Seasoning-Basic-Hori-Kello","name":"Kellolaa","sub_code":"01","sub_name":"Hori","created_at":"2020-06-08 08:50:02","updated_at":"2020-06-08 08:50:02","company":4,"primary":{"id":2,"code":"2","name":"Healt","created_at":"2020-05-19 07:05:02","updated_at":"2020-05-19 07:09:28"},"head":{"id":2,"code":"2","name":"Seasoning","created_at":"2020-04-14 19:34:33","updated_at":"2020-04-14 19:34:33"},"body":{"id":2,"code":"2","name":"Basic","created_at":"2020-04-14 19:33:54","updated_at":"2020-04-14 19:33:54"},"contacts":[]}'
    `,
    response: makeRESTRequest({
      method: "PUT",
      name: "Untitled",
      endpoint: "http://127.0.0.1:8000/api/admin/crm/brand/4",
      auth: {
        authType: "basic",
        authActive: true,
        username: "avs",
        password: "def",
      },
      body: {
        contentType: "application/hal+json",
        body: `{
  "id": 4,
  "crm_company_id": 4,
  "industry_primary_id": 2,
  "industry_head_id": 2,
  "industry_body_id": 2,
  "code": "01",
  "barcode": "222010101",
  "summary": "Healt-Seasoning-Basic-Hori-Kello",
  "name": "Kellolaa",
  "sub_code": "01",
  "sub_name": "Hori",
  "created_at": "2020-06-08 08:50:02",
  "updated_at": "2020-06-08 08:50:02",
  "company": 4,
  "primary": {
    "id": 2,
    "code": "2",
    "name": "Healt",
    "created_at": "2020-05-19 07:05:02",
    "updated_at": "2020-05-19 07:09:28"
  },
  "head": {
    "id": 2,
    "code": "2",
    "name": "Seasoning",
    "created_at": "2020-04-14 19:34:33",
    "updated_at": "2020-04-14 19:34:33"
  },
  "body": {
    "id": 2,
    "code": "2",
    "name": "Basic",
    "created_at": "2020-04-14 19:33:54",
    "updated_at": "2020-04-14 19:33:54"
  },
  "contacts": []
}`,
      },
      headers: [
        {
          active: true,
          key: "User-Agent",
          value:
            "Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0",
          description: "",
        },
        {
          active: true,
          key: "Accept",
          value: "application/json, text/plain, */*",
          description: "",
        },
        {
          active: true,
          key: "Accept-Language",
          value: "en",
          description: "",
        },
        {
          active: true,
          key: "Origin",
          value: "http://localhost:3012",
          description: "",
        },
        {
          active: true,
          key: "Connection",
          value: "keep-alive",
          description: "",
        },
        {
          active: true,
          key: "Referer",
          value: "http://localhost:3012/crm/company/4",
          description: "",
        },
      ],
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl google.com`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://google.com/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: null,
        body: null,
      },
      headers: [],
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl -X POST -d '{"foo":"bar"}' http://localhost:1111/hello/world/?bar=baz&buzz`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "http://localhost:1111/hello/world/?buzz",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: "application/json",
        body: `{\n  "foo": "bar"\n}`,
      },
      headers: [],
      params: [
        {
          active: true,
          key: "bar",
          value: "baz",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --get -d "tool=curl" -d "age=old" https://example.com`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://example.com/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: null,
        body: null,
      },
      headers: [],
      params: [
        {
          active: true,
          key: "tool",
          value: "curl",
          description: "",
        },
        {
          active: true,
          key: "age",
          value: "old",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl -F hello=hello2 -F hello3=@hello4.txt bing.com`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "https://bing.com/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: "multipart/form-data",
        body: [
          {
            active: true,
            isFile: false,
            key: "hello",
            value: "hello2",
          },
          {
            active: true,
            isFile: false,
            key: "hello3",
            value: "",
          },
        ],
      },
      headers: [],
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command:
      "curl -X GET localhost -H 'Accept: application/json' --user root:toor",
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "http://localhost/",
      auth: {
        authType: "basic",
        authActive: true,
        username: "root",
        password: "toor",
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "Accept",
          value: "application/json",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command:
      "curl -X GET localhost --header 'Authorization: Basic dXNlcjpwYXNz'",
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "http://localhost/",
      auth: {
        authType: "basic",
        authActive: true,
        username: "user",
        password: "pass",
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "Authorization",
          value: "Basic dXNlcjpwYXNz",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command:
      "curl -X GET localhost:9900 --header 'Authorization: Basic 77898dXNlcjpwYXNz'",
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "http://localhost:9900/",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "Authorization",
          value: "Basic 77898dXNlcjpwYXNz",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command:
      "curl -X GET localhost --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'",
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "http://localhost/",
      auth: {
        authType: "bearer",
        authActive: true,
        token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "Authorization",
          value:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --get -I -d "tool=curl" -d "platform=hoppscotch" -d"io" https://hoppscotch.io`,
    response: makeRESTRequest({
      method: "HEAD",
      name: "Untitled",
      endpoint: "https://hoppscotch.io/?io",
      auth: {
        authActive: true,
        authType: "inherit",
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [
        {
          active: true,
          key: "tool",
          value: "curl",
          description: "",
        },
        {
          active: true,
          key: "platform",
          value: "hoppscotch",
          description: "",
        },
      ],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl 'https://someshadywebsite.com/questionable/path/?and=params&so&stay=tuned&' \
  -H 'user-agent: Mozilla/5.0' \
  -H 'accept: text/html' \
  -H $'cookie: cookie-cookie' \
  --data $'------WebKitFormBoundaryj3oufpIISPa2DP7c\\r\\nContent-Disposition: form-data; name="EmailAddress"\\r\\n\\r\\ntest@test.com\\r\\n------WebKitFormBoundaryj3oufpIISPa2DP7c\\r\\nContent-Disposition: form-data; name="Entity"\\r\\n\\r\\n1\\r\\n------WebKitFormBoundaryj3oufpIISPa2DP7c--\\r\\n'`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "https://someshadywebsite.com/questionable/path/?so",
      auth: {
        authActive: true,
        authType: "inherit",
      },
      body: {
        contentType: "multipart/form-data",
        body: [
          {
            active: true,
            isFile: false,
            key: "EmailAddress",
            value: "test@test.com",
          },
          {
            active: true,
            isFile: false,
            key: "Entity",
            value: "1",
          },
        ],
      },
      params: [
        {
          active: true,
          key: "and",
          value: "params",
          description: "",
        },
        {
          active: true,
          key: "stay",
          value: "tuned",
          description: "",
        },
      ],
      headers: [
        {
          active: true,
          key: "user-agent",
          value: "Mozilla/5.0",
          description: "",
        },
        {
          active: true,
          key: "accept",
          value: "text/html",
          description: "",
        },
        {
          active: true,
          key: "cookie",
          value: "cookie-cookie",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command:
      "curl localhost -H 'content-type: multipart/form-data; boundary=------------------------d74496d66958873e' --data '-----------------------------d74496d66958873e\\r\\nContent-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\\r\\nContent-Type: text/plain\\r\\n\\r\\nHello World\\r\\n\\r\\n-----------------------------d74496d66958873e--\\r\\n'",
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "http://localhost/",
      auth: {
        authActive: true,
        authType: "inherit",
      },
      body: {
        contentType: "multipart/form-data",
        body: [
          {
            active: true,
            isFile: false,
            key: "file",
            value: "",
          },
        ],
      },
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl 'https://hoppscotch.io/' \
    -H 'authority: hoppscotch.io' \
    -H 'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"' \
    -H 'accept: */*' \
    -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' \
    -H 'sec-ch-ua-platform: "Windows"' \
    -H 'accept-language: en-US,en;q=0.9,ml;q=0.8' \
    --compressed`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://hoppscotch.io/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "authority",
          value: "hoppscotch.io",
          description: "",
        },
        {
          active: true,
          key: "sec-ch-ua",
          value:
            '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
          description: "",
        },
        {
          active: true,
          key: "accept",
          value: "*/*",
          description: "",
        },
        {
          active: true,
          key: "user-agent",
          value:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
          description: "",
        },
        {
          active: true,
          key: "sec-ch-ua-platform",
          value: '"Windows"',
          description: "",
        },
        {
          active: true,
          key: "accept-language",
          value: "en-US,en;q=0.9,ml;q=0.8",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --request GET \
    --url 'https://echo.hoppscotch.io/?hello=there' \
    --header 'content-type: application/x-www-form-urlencoded' \
    --header 'something: other-thing' \
    --data a=b \
    --data c=d`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: rawKeyValueEntriesToString([
          {
            key: "a",
            value: "b",
            active: true,
          },
          {
            key: "c",
            value: "d",
            active: true,
          },
        ]),
      },
      params: [
        {
          active: true,
          key: "hello",
          value: "there",
          description: "",
        },
      ],
      headers: [
        {
          active: true,
          key: "something",
          value: "other-thing",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --request POST \
    --url 'https://echo.hoppscotch.io/?hello=there' \
    --header 'content-type: multipart/form-data' \
    --header 'something: other-thing' \
    --form a=b \
    --form c=d`,
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      method: "POST",
      auth: { authType: "inherit", authActive: true },
      headers: [
        {
          active: true,
          key: "something",
          value: "other-thing",
          description: "",
        },
      ],
      body: {
        contentType: "multipart/form-data",
        body: [
          {
            active: true,
            isFile: false,
            key: "a",
            value: "b",
          },
          {
            active: true,
            isFile: false,
            key: "c",
            value: "d",
          },
        ],
      },
      params: [
        {
          active: true,
          key: "hello",
          value: "there",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: "curl 'muxueqz.top/skybook.html'",
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "https://muxueqz.top/skybook.html",
      method: "GET",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      body: { contentType: null, body: null },
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: "curl -F abcd=efghi",
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      method: "POST",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      body: {
        contentType: "multipart/form-data",
        body: [
          {
            active: true,
            isFile: false,
            key: "abcd",
            value: "efghi",
          },
        ],
      },
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: "curl 127.0.0.1 -X custommethod",
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "http://127.0.0.1/",
      method: "CUSTOMMETHOD",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: "curl echo.hoppscotch.io -A pinephone",
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      method: "GET",
      auth: { authType: "inherit", authActive: true },
      headers: [
        {
          active: true,
          key: "User-Agent",
          value: "pinephone",
          description: "",
        },
      ],
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: "curl echo.hoppscotch.io -G",
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      method: "GET",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --get -I -d "tool=hopp" https://example.org`,
    response: makeRESTRequest({
      name: "Untitled",
      endpoint: "https://example.org/",
      method: "HEAD",
      auth: { authType: "inherit", authActive: true },
      headers: [],
      body: {
        contentType: null,
        body: null,
      },
      params: [
        {
          active: true,
          key: "tool",
          value: "hopp",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl google.com -u userx`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://google.com/",
      auth: {
        authType: "basic",
        authActive: true,
        username: "userx",
        password: "",
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl google.com -H "Authorization"`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://google.com/",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl \`
  google.com -H "content-type: application/json"`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://google.com/",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl 192.168.0.24:8080/ping`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "http://192.168.0.24:8080/ping",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl https://example.com -d "alpha=beta&request_id=4"`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "https://example.com/",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: rawKeyValueEntriesToString([
          {
            active: true,
            key: "alpha",
            value: "beta",
          },
          {
            active: true,
            key: "request_id",
            value: "4",
          },
        ]),
      },
      params: [],
      headers: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --location 'https://api.example.net/id/1164/requests' \
    --header 'Accept: application/vnd.test-data.v2.1+json' \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'data={"type":"test","typeId":"101"}' \
    --data-urlencode 'data2={"type":"test2","typeId":"123"}'`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "https://api.example.net/id/1164/requests",
      auth: {
        authType: "inherit",
        authActive: true,
      },
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: `data: {"type":"test","typeId":"101"}
data2: {"type":"test2","typeId":"123"}`,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "Accept",
          value: "application/vnd.test-data.v2.1+json",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl --request GET \
    --url https://echo.hoppscotch.io/ \
    --header 'Authorization:Basic YXNkZmdoOjEyMzQ=' \
    --header 'User-Agent:Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0'
    --header 'foo:bar'`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/",
      auth: {
        authType: "basic",
        authActive: true,
        username: "asdfgh",
        password: "1234",
      },
      body: {
        contentType: null,
        body: null,
      },
      params: [],
      headers: [
        {
          active: true,
          key: "Authorization",
          value: "Basic YXNkZmdoOjEyMzQ=",
          description: "",
        },
        {
          active: true,
          key: "User-Agent",
          value:
            "Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0",
          description: "",
        },
        {
          active: true,
          key: "foo",
          value: "bar",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  // Test case with unencoded RFC 3986 legal query chars (*, ~, !, $, [, ])
  // and checks that '$' at the end of tag=~hello!$ is NOT stripped by the preprocessor.
  // This guards against the regression where the naive S.replace(/\$'/g, "'") would strip it.
  {
    command: `curl 'https://echo.hoppscotch.io/api?bi=1440*2976&nested[a]=b&tag=~hello!$'`,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled",
      endpoint: "https://echo.hoppscotch.io/api",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: null,
        body: null,
      },
      headers: [],
      params: [
        {
          active: true,
          key: "bi",
          value: "1440*2976",
          description: "",
        },
        {
          active: true,
          key: "nested[a]",
          value: "b",
          description: "",
        },
        {
          active: true,
          key: "tag",
          value: "~hello!$",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  {
    command: `curl -X POST 'https://x.x.cn/x/x/x?bi=%5B%221440*2976%22%5D&bik=25&~wave=1'`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "https://x.x.cn/x/x/x",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: null,
        body: null,
      },
      headers: [],
      params: [
        {
          active: true,
          key: "bi",
          value: '["1440*2976"]',
          description: "",
        },
        {
          active: true,
          key: "bik",
          value: "25",
          description: "",
        },
        {
          active: true,
          key: "~wave",
          value: "1",
          description: "",
        },
      ],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
  // Test case that ensures bash ANSI-C dollar-single-quote quoting format ( $'...' )
  // is successfully stripped even when it follows an equal sign (=).
  // Under the new regex, the equal sign boundary is correctly matched and preserved.
  {
    command: `curl https://example.com --data=$'{"a": 1}' -H=$'Content-Type: application/json'`,
    response: makeRESTRequest({
      method: "POST",
      name: "Untitled",
      endpoint: "https://example.com/",
      auth: { authType: "inherit", authActive: true },
      body: {
        contentType: "application/json",
        body: `{\n  "a": 1\n}`,
      },
      headers: [],
      params: [],
      preRequestScript: "",
      testScript: "",
      requestVariables: [],
      responses: {},
      description: null,
    }),
  },
]

describe("Parse curl command to Hopp REST Request", () => {
  test("parses json body with semicolon-only headers", () => {
    const command = String.raw`curl 'https://echo.hoppscotch.io/api/process/insert' \
  -H 'Authorization-OAuth2;' \
  -H 'Authorization-OAuth2-Client;' \
  -H 'Authorization-OAuth2-Refresh;' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  --data-raw '{"insertProcessDto":{"name":"测hi退回"},"formSaveDTO":{"formProps":"{\"list\":[]}"}}' \
  --insecure`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe(
      "https://echo.hoppscotch.io/api/process/insert"
    )
    expect(actual.body.contentType).toBe("application/json")

    const parsedBody = JSON.parse(actual.body.body)
    expect(parsedBody.insertProcessDto.name).toBe("测hi退回")
    expect(JSON.parse(parsedBody.formSaveDTO.formProps)).toEqual({ list: [] })
  })

  test("parses json body containing escaped XML", () => {
    const command = String.raw`curl 'https://echo.hoppscotch.io/api/process/insert' \
  -H 'Authorization-OAuth2;' \
  -H 'Authorization-OAuth2-Client;' \
  -H 'Authorization-OAuth2-Refresh;' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  --data-raw '{"insertProcessDto":{"bpmnXmlString":"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<bpmn2:definitions xmlns:bpmn2=\"http://www.omg.org/spec/BPMN/20100524/MODEL\"></bpmn2:definitions>"},"formSaveDTO":{"formProps":"{\"list\":[]}"}}' \
  --insecure`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe(
      "https://echo.hoppscotch.io/api/process/insert"
    )
    expect(actual.body.contentType).toBe("application/json")

    const parsedBody = JSON.parse(actual.body.body)
    expect(parsedBody.insertProcessDto.bpmnXmlString).toContain("<?xml")
    expect(parsedBody.insertProcessDto.bpmnXmlString).toContain(
      "bpmn2:definitions"
    )
    expect(JSON.parse(parsedBody.formSaveDTO.formProps)).toEqual({ list: [] })
  })

  test("does not drop JSON body for -d with many headers", () => {
    const command = `curl 'https://echo.hoppscotch.io/api/chat/completions' -d '{"response_format":{"type":"json_object"},"messages":[{"content":"Translate array of texts from en into zh and return JSON result with the same array length, do not add any additional text, and do not return code blocks, such as: {\\"translations\\": [\\"translation of input text 1\\", ...]}","role":"system"},{"content":"[\\"Epic Games CEO Tim Sweeney argues banning Twitter over its ability to AI-generate pornographic images of minors is just '''gatekeepers''' attempting to '''censor all of their political opponents'''\\"]","role":"user"}],"model":"gpt-translate","temperature":0.30000001192092896}' -H ':authority: echo.hoppscotch.io' -H 'accept: */*' -H 'content-type: application/json' -H 'accept-language: en-US;q=1.0, zh-Hans-US;q=0.9' -H 'authorization: Bearer <redacted>' -H 'accept-encoding: br;q=1.0, gzip;q=0.9, deflate;q=0.8' -H 'user-agent: TranslationExtension/1.14.5 (org.lesslab.relingo.TranslationExtension; build:104; iOS 26.2.0) Alamofire/5.10.2' -H 'priority: u=3, i' --compressed`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe(
      "https://echo.hoppscotch.io/api/chat/completions"
    )
    expect(actual.body.contentType).toBe("application/json")

    const parsedBody = JSON.parse(actual.body.body)
    expect(parsedBody.model).toBe("gpt-translate")
    expect(parsedBody.temperature).toBe(0.30000001192092896)
    expect(parsedBody.response_format).toEqual({ type: "json_object" })
    expect(parsedBody.messages).toHaveLength(2)
    expect(parsedBody.messages[0].role).toBe("system")
    expect(parsedBody.messages[0].content).toBe(
      `Translate array of texts from en into zh and return JSON result with the same array length, do not add any additional text, and do not return code blocks, such as: {"translations": ["translation of input text 1", ...]}`
    )
    expect(parsedBody.messages[1].role).toBe("user")
    expect(parsedBody.messages[1].content).toBe(
      `["Epic Games CEO Tim Sweeney argues banning Twitter over its ability to AI-generate pornographic images of minors is just '''gatekeepers''' attempting to '''censor all of their political opponents'''"]`
    )
  })

  test("preserves -d POST without -G as form-urlencoded", () => {
    const command = `curl -X POST 'https://example.com/submit' -d 'name=alice&role=admin'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe("https://example.com/submit")
    expect(actual.body.contentType).toBe("application/x-www-form-urlencoded")
    expect(actual.body.body).toBe("name: alice\nrole: admin")
  })

  test("does not intercept -d inside a quoted header value", () => {
    const command = `curl 'https://example.com/api' -H 'X-Custom: -d {"fake":1}' -d '{"real":true}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ real: true })

    const customHeader = actual.headers.find((h) => h.key === "X-Custom")
    expect(customHeader).toBeDefined()
    expect(customHeader.value).toBe(`-d {"fake":1}`)
  })

  test("does not corrupt body data containing space dash letter equals (e.g. -q=value)", () => {
    const command = `curl 'https://example.com/api' -d '{"filter": "field -q=value"}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ filter: "field -q=value" })
  })

  test("normalizes short options with equals followed by quotes", () => {
    const command = `curl 'https://example.com/api' -H='Content-Type: application/json' -d='{"foo": "bar"}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ foo: "bar" })
  })

  test("parses double-quoted URL and preserves commonly tolerated unencoded characters", () => {
    const command = `curl "https://example.com/api?filter={id}|all"`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toEqual([
      {
        active: true,
        key: "filter",
        value: "{id}|all",
        description: "",
      },
    ])
  })

  test("preserves dollar quote inside quoted url query parameter", () => {
    const command = `curl "https://example.com/api?q=$'foo'"`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toEqual([
      {
        active: true,
        key: "q",
        value: "$'foo'",
        description: "",
      },
    ])
  })

  test("does not rewrite flag-like text inside header values", () => {
    const command = `curl 'https://example.com/api' -H 'X-Value: -q="value"'`

    const actual = parseCurlToHoppRESTReq(command)

    const customHeader = actual.headers.find((h) => h.key === "X-Value")
    expect(customHeader).toBeDefined()
    expect(customHeader?.value).toBe(`-q="value"`)
  })

  test("does not rewrite long options inside json body payloads", () => {
    const command = `curl 'https://example.com/api' -d '{"text":" --data=foo"}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ text: " --data=foo" })
  })

  test("preserves inner double quote when URL is wrapped in single quotes", () => {
    const command = `curl 'https://example.com/api?q=abc"'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toEqual([
      {
        active: true,
        key: "q",
        value: 'abc"',
        description: "",
      },
    ])
  })

  test("preserves request method when ANSI-C header contains escaped quote and option-like text", () => {
    const command = `curl 'https://example.com/api' -H $'X-Custom: val\\' --request POST'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("GET")
    const customHeader = actual.headers.find((h) => h.key === "X-Custom")
    expect(customHeader).toBeDefined()
    expect(customHeader?.value).toBe("val' --request POST")
  })

  test("correctly parses request method and JSON body when header ends with escaped backslashes before closing quote", () => {
    const command = `curl "https://example.com/api" -H "User: C:\\\\" --request PUT -d '{"key": "value"}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("PUT")
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ key: "value" })
  })

  test("normalizes short options with equals followed by bash ANSI-C quotes", () => {
    const command = `curl 'https://example.com/api' -d=$'{"key":"value"}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ key: "value" })
  })

  test("handles POSIX single-quoted argument ending with literal backslash", () => {
    const command = `curl 'https://example.com/api' -H 'X-Custom: val\\' -X POST`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("POST")
    const customHeader = actual.headers.find((h) => h.key === "X-Custom")
    expect(customHeader).toBeDefined()
    expect(customHeader?.value).toBe("val\\")
  })

  test("preserves dollar when preceded by backslash outside quotes", () => {
    const command = `curl https://example.com/api?q=a\\$'b'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toEqual([
      {
        active: true,
        key: "q",
        value: "a$'b'",
        description: "",
      },
    ])
  })

  test("does not swallow subsequent options when escaped quote appears outside quotes during preprocessing", () => {
    const command = `curl https://example.com/api?q=a\\"b -XPOST`

    expect(preProcessCurlCommand(command)).toBe(
      `curl https://example.com/api?q=a\\"b -X POST`
    )
  })

  test("preserves query param and avoids placeholder leaks for ANSI-C strings with escaped quotes in URL", () => {
    const command = `curl https://example.com/api?q=$'a\\'b'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toEqual([
      {
        active: true,
        key: "q",
        value: "a'b",
        description: "",
      },
    ])
  })

  test("preserves options after embedded ANSI-C string in URL query", () => {
    const command = `curl https://example.com/api?q=$'a\\'b' -X POST`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.method).toBe("POST")
    expect(actual.params).toEqual([
      {
        active: true,
        key: "q",
        value: "a'b",
        description: "",
      },
    ])
  })

  test("preserves literal quotes in query parameter values", () => {
    const command = `curl 'https://example.com/api?q="hello world"&a="'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.params).toEqual([
      {
        active: true,
        key: "q",
        value: '"hello world"',
        description: "",
      },
      {
        active: true,
        key: "a",
        value: '"',
        description: "",
      },
    ])
  })

  test("correctly parses ANSI-C arguments directly attached to short options", () => {
    const command = `curl 'https://example.com/api' -d$'{"a":1}' -H$'X-Test: value'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.method).toBe("POST")
    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: "value",
      active: true,
      description: "",
    })
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ a: 1 })
  })

  test("correctly parses ANSI-C arguments directly attached to short options with escaped apostrophes", () => {
    const command = `curl 'https://example.com/api' -d$'it\\'s' -H$'X-Test: it\\'s'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.method).toBe("POST")
    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: "it's",
      active: true,
      description: "",
    })
    expect(actual.body.body).toBe("it's")
  })

  test("correctly parses concatenated ANSI-C and locale quotes in query parameters", () => {
    const command = `curl https://example.com/api?q=abc$'def'&r=$'foo'&s=hello$"world"`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toContainEqual({
      key: "q",
      value: "abcdef",
      active: true,
      description: "",
    })
    expect(actual.params).toContainEqual({
      key: "r",
      value: "foo",
      active: true,
      description: "",
    })
    expect(actual.params).toContainEqual({
      key: "s",
      value: "helloworld",
      active: true,
      description: "",
    })
  })

  test("preserves option-like values passed with equals in --data and -d", () => {
    const cmd1 = `curl --data=--get https://example.com`
    const actual1 = parseCurlToHoppRESTReq(cmd1)
    expect(actual1.method).toBe("POST")
    expect(actual1.body.body).toBe("--get")

    const cmd2 = `curl -d=--get https://example.com`
    const actual2 = parseCurlToHoppRESTReq(cmd2)
    expect(actual2.method).toBe("POST")
    expect(actual2.body.body).toBe("--get")
  })

  test("preserves token boundaries and spaces for mid-word locale and ANSI-C quotes", () => {
    const command = `curl https://example.com/api?q=$"hello world"&r=$'it\\'s great'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.method).toBe("GET")
    expect(actual.endpoint).toBe("https://example.com/api")
    expect(actual.params).toContainEqual({
      key: "q",
      value: "hello world",
      active: true,
      description: "",
    })
    expect(actual.params).toContainEqual({
      key: "r",
      value: "it's great",
      active: true,
      description: "",
    })
  })

  test("does not overwrite literal placeholder in non-data arguments when JSON data is extracted", () => {
    const command = `curl 'https://example.com/api' -H 'X-Test: __HOPP_CURL_JSON_DATA_0__' -d '{"target":"body"}'`

    const actual = parseCurlToHoppRESTReq(command)

    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: "__HOPP_CURL_JSON_DATA_0__",
      active: true,
      description: "",
    })
    expect(actual.body.contentType).toBe("application/json")
    expect(JSON.parse(actual.body.body)).toEqual({ target: "body" })
  })

  test("correctly parses ANSI-C header containing both escaped single quote and double quotes", () => {
    const command = `curl 'https://example.com/api' -H $'X-Test: it\\'s "a b"'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: `it's "a b"`,
      active: true,
      description: "",
    })
  })

  test("correctly parses ANSI-C header containing double quotes and trailing escaped single quote", () => {
    const command = `curl 'https://example.com/api' -H $'X-Test: "quoted" \\''`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: `"quoted" '`,
      active: true,
      description: "",
    })
  })

  test("correctly parses locale string header with embedded quotes", () => {
    const command = `curl 'https://example.com/api' -H $"X-Test: \\"quoted\\" \\'"`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: `"quoted" \\'`,
      active: true,
      description: "",
    })
  })

  test("correctly parses ANSI-C JSON body with escaped quote", () => {
    const command = `curl 'https://example.com/api' -H 'Content-Type: application/json' -d $'{"name": "it\\'s special"}'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.body.contentType).toBe("application/json")
    expect(actual.body.body).toBe('{\n  "name": "it\'s special"\n}')
    expect(JSON.parse(actual.body.body)).toEqual({ name: "it's special" })
  })

  test("correctly preserves request method and body for non-JSON --data-raw argument", () => {
    const command = `curl 'https://example.com/api' --data-raw 'a=b&c=d'`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.method).toBe("POST")
    expect(actual.body.body).toBe("a: b\nc: d")
  })

  test("does not restore literal sentinel string when no quotes were protected", () => {
    const command = `curl "https://example.com/" -H "X-Tag: __HOPP_ESC_DQUOTE__"`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.headers).toContainEqual({
      key: "X-Tag",
      value: "__HOPP_ESC_DQUOTE__",
      active: true,
      description: "",
    })
  })

  test("does not overwrite literal sentinel string even if other escaped quotes exist", () => {
    const command = `curl 'https://example.com/api' -H 'X-Test: __HOPP_ESC_DQUOTE__' -H $'X-Other: "quoted" \\''`

    const actual = parseCurlToHoppRESTReq(command)
    expect(actual.headers).toContainEqual({
      key: "X-Test",
      value: "__HOPP_ESC_DQUOTE__",
      active: true,
      description: "",
    })
    expect(actual.headers).toContainEqual({
      key: "X-Other",
      value: `"quoted" '`,
      active: true,
      description: "",
    })
  })

  for (const [i, { command, response }] of samples.entries()) {
    test(`for sample #${i + 1}:\n\n${command}`, () => {
      const actual = parseCurlToHoppRESTReq(command)

      /**
       * An object possibly carrying an internal reference id.
       * @typedef {object} RefIdCarrier
       * @property {unknown} [_ref_id]
       */

      /**
       * @template {object} T
       * @param {T & RefIdCarrier} obj
       * @returns {Omit<T, "_ref_id">}
       */
      const stripRefId = (obj) => {
        const clone = { ...obj }
        delete clone._ref_id
        return clone
      }

      // Strip off _ref_id added by makeRESTRequest for equality check because it is generated randomly
      expect(stripRefId(actual)).toEqual(stripRefId(response))
    })
  }
})
