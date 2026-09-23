import { describe, expect, test } from "vitest"
import {
  getLocalSecretReferenceID,
  redactSensitiveChatValues,
  replaceSensitiveChatValues,
} from "../secret-references"

// Mirrors the backend REDACTED_CASES; its spec runs both copies on them.
const REDACTED_CASES: Array<[string, string]> = [
  // Dotted and call-shaped values are credentials unless a script root leads.
  ["refresh_token=ya29.a0AfH6SMBxyz", "refresh_token=[REDACTED]"],
  [
    "GET /me?access_token=ya29.a0AfH6SMBxyz&alt=json",
    "GET /me?access_token=[REDACTED]&alt=json",
  ],
  [
    "GET /v4?access_token=sk.eyJ1IjoiYWJj.aBcD",
    "GET /v4?access_token=[REDACTED]",
  ],
  ["- access_token: pk.eyJ1IjoiYWJj.aBcD", "- access_token: [REDACTED]"],
  ["api_key=abc.def123", "api_key=[REDACTED]"],
  ["password: john.doe1990", "password: [REDACTED]"],
  ["client_secret=abc123.xyz", "client_secret=[REDACTED]"],
  ["- X-API-Key: key(1234567", "- X-API-Key: [REDACTED]"],
  ["password=$uperSecret", "password=[REDACTED]"],
  // A body cut off inside a quoted value.
  ['password: "unterminated', 'password: "[REDACTED]'],
  ['{"password": "hunter2secretvalue…[truncated]', '{"password": "[REDACTED]'],
  ["password: 'hunter2", "password: '[REDACTED]"],
  // Header and param lines run to their end, `&` and spaces included.
  ["- password: correct horse battery", "- password: [REDACTED]"],
  ["- password: P@ss&word!9", "- password: [REDACTED]"],
  ["- X-API-Key: ab&cdef0123456789", "- X-API-Key: [REDACTED]"],
  ["password: P@ss&word", "password: [REDACTED]"],
  // Capitalised words are types only inside SDL.
  ["api_key: Welcome!", "api_key: [REDACTED]"],
  ["- password: Secret!", "- password: [REDACTED]"],
  ["password=Welcome!", "password=[REDACTED]"],
  ["password: 123456", "password: [REDACTED]"],
  ["login(password: hunter2)", "login(password: [REDACTED])"],
  ["f(g(password: hunter2))", "f(g(password: [REDACTED]))"],
  // A GraphQL head left open (truncation, prose) exempts nothing after it.
  [
    'Body (application/json):\n{"query":"query Orders { orders { edges { node { id…[truncated]\n\n### Latest response\nBody (truncated):\naccess_token=Zq81hVb7Pp2mLx0rT9&token_type=bearer',
    'Body (application/json):\n{"query":"query Orders { orders { edges { node { id…[truncated]\n\n### Latest response\nBody (truncated):\naccess_token=[REDACTED]&token_type=bearer',
  ],
  [
    "Send the input payload { grant_type\nBody:\ngrant_type=password&password=Hunter2Pass",
    "Send the input payload { grant_type\nBody:\ngrant_type=password&password=[REDACTED]",
  ],
  // A line-start key takes its whole line, spaces, `&`, `,` and `'` included.
  ["password: correct horse battery", "password: [REDACTED]"],
  ["DB_PASSWORD=Tr0ub4dor&3xtra", "DB_PASSWORD=[REDACTED]"],
  ["SMTP_PASSWORD=abc,def,ghi123", "SMTP_PASSWORD=[REDACTED]"],
  ["password: O'Neil#2024x", "password: [REDACTED]"],
  ["- Api-Key : abc def", "- Api-Key : [REDACTED]"],
  ["token: >-\n  QQ7IdH7fq2w9e8", "token: >-\n  [REDACTED]"],
  // Name and value in separate fields or arguments.
  [
    '[{"key": "Authorization", "value": "Bearer 9a8b7c6d5e4f3a2b1c0d"}]',
    '[{"key": "Authorization", "value": "Bearer [REDACTED]"}]',
  ],
  [
    '{"Name":"/prod/db/password","Type":"SecureString","Value":"Hunter2Pass"}',
    '{"Name":"/prod/db/password","Type":"SecureString","Value":"[REDACTED]"}',
  ],
  [
    'pw.env.set("api_key", "Q3xk9LmP2vR8tY6wZ1aB");',
    'pw.env.set("api_key", "[REDACTED]");',
  ],
  ["['password' => 'Hunter2Pass']", "['password' => '[REDACTED]']"],
  // Stringified JSON.
  [
    '{"body":"{\\"password\\":\\"Hunter2Pass\\"}"}',
    '{"body":"{\\"password\\":\\"[REDACTED]\\"}"}',
  ],
  [
    '{\\"Authorization\\":\\"Bearer 9a8b7c6d5e4f\\"}',
    '{\\"Authorization\\":\\"Bearer [REDACTED]\\"}',
  ],
  // Any Authorization scheme keeps its word and loses its credential.
  [
    "- Authorization: ApiKey VnVhQ2ZHY0JDZGJr==",
    "- Authorization: ApiKey [REDACTED]",
  ],
  [
    "- Authorization: SSWS 00QCjAl4MlV-WPXM",
    "- Authorization: SSWS [REDACTED]",
  ],
  [
    '- Authorization: Token token="c2VjcmV0dG9rZW4"',
    "- Authorization: Token [REDACTED]",
  ],
  [
    '- Authorization: Digest username="a", response="6629fae4"',
    "- Authorization: Digest [REDACTED]",
  ],
  // user:password outside `//user:pass@`.
  [
    "curl -u admin:S3cr3tP4ss https://api.example.com",
    "curl -u admin:[REDACTED] https://api.example.com",
  ],
  [
    "REDIS_URL=redis://:Sup3rS3cret@cache:6379",
    "REDIS_URL=redis://:[REDACTED]@cache:6379",
  ],
  // More key names and shapes.
  [
    "GET /1/members/me?key=79d783ac00125ac1&token=ATTA123",
    "GET /1/members/me?key=[REDACTED]&token=[REDACTED]",
  ],
  [
    "GET /b.txt?sv=2022&sig=AbCdEf%2BGh123",
    "GET /b.txt?sv=2022&sig=[REDACTED]",
  ],
  [
    "AccountKey=54MhAbC==;EndpointSuffix=core.windows.net",
    "AccountKey=[REDACTED];EndpointSuffix=core.windows.net",
  ],
  ["DB_PASS=Tr0ub4dorX9", "DB_PASS=[REDACTED]"],
  ["MYSQL_PWD=Tr0ub4dorX9", "MYSQL_PWD=[REDACTED]"],
  ["- X-Functions-Key: 54MhAbC==", "- X-Functions-Key: [REDACTED]"],
  ["PHPSESSID=79d783ac00125", "PHPSESSID=[REDACTED]"],
  [
    "https://hooks.slack.com/services/T0ABCDEFGH/B0ABCDEFGH/oeHS8i4byjbrdg1JxQ3E",
    "https://hooks.slack.com/services/[REDACTED]",
  ],
  [
    "my token is github_pat_11AD9URBK0HU89S38HVLWI_VWQWabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ",
    "my token is [REDACTED]",
  ],
  ["temporary key ASIAMVS3NDJQC14F4Z0U", "temporary key [REDACTED]"],
  [
    "client secret is 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",
    "client secret is [REDACTED]",
  ],
  [
    '{"set-cookie": ["connect.sid=s%3AabcDEF123456; Path=/"]}',
    '{"set-cookie": ["[REDACTED]"]}',
  ],
  [
    "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,AB12\n\nMIIEvQ+/=\n-----END RSA PRIVATE KEY-----",
    "[REDACTED]",
  ],
  // Exemptions cover whole values only.
  ["DB_PASSWORD={Xy9!pQ7zR}", "DB_PASSWORD=[REDACTED]"],
  ["- password: [Xy9!pQ7zR]", "- password: [REDACTED]"],
  ["password=$UPER2024SECRET", "password=[REDACTED]"],
  ['{"password": "<<user>>Hunter2Secret"}', '{"password": "[REDACTED]"}'],
  ["Cookie: <<cookieVar>>; auth=abcdef123secret", "Cookie: [REDACTED]"],
  ["Password=my.pass;Server=db", "Password=[REDACTED];Server=db"],
  ["api_key={{apiKey}}Xy9", "api_key=[REDACTED]"],
  // Short keys keep counts, paths and names; `*_PASS` stays strict.
  ["pass=hunter2", "pass=[REDACTED]"],
  ["DB_PASS=12345", "DB_PASS=[REDACTED]"],
  ["SIGNING_KEY=mysecretvalue", "SIGNING_KEY=[REDACTED]"],
  ["pwd: Tr0ub4dor&3", "pwd: [REDACTED]"],
  ["GET /v1?key=AbCdEf123456", "GET /v1?key=[REDACTED]"],
  ["GET /b.txt?sig=a1b2c3d4e5f6", "GET /b.txt?sig=[REDACTED]"],
  // A placeholder in the user keeps its own colon.
  [
    "curl -u <<user>>:Hunter2Pass https://x",
    "curl -u <<user>>:[REDACTED] https://x",
  ],
  [
    "curl -u admin<<suffix>>:Hunter2Pass https://x",
    "curl -u admin<<suffix>>:[REDACTED] https://x",
  ],
]

// Mirrors the backend UNCHANGED_CASES.
const UNCHANGED_CASES = [
  '{"token": []}',
  '{"session": [1, 2], "items": []}',
  '{"session_id": 12345, "token": 482913}',
  "query { viewer { sessionToken: token } }",
  "query { login(session: WEB) { id } }",
  "mutation Refresh($token: String!, $session: SessionInput) { refresh(token: $token, session: $session) { accessToken } }",
  "mutation Refresh(\n  $token: String!\n) {\n  refresh(token: $token) { id }\n}",
  '{"query":"{ viewer { sessionToken: token } }"}',
  "type Query {\n  session: Session!\n  token: AuthToken!\n}",
  "if (token === undefined) return",
  "const f = token => token.trim()",
  "const session = await hopp.fetch(url)",
  "let token = 0",
  "const token = JSON.parse(pw.response.body).token",
  'curl -H "x-api-key: $API_KEY"',
  // The model's own scripts and docs.
  'const body = pw.response.body;\nconst token = body.token;\npw.env.set("token", token);',
  "const token = res.body.token",
  "const t = { token: data.token }",
  "let session = json.session;",
  "let token = null;",
  "const sessionId = cookies.session;",
  'const token = localStorage.getItem("token")',
  "token = await login(user, pass);",
  // A closed call keeps its own `)`.
  "const token = getToken()",
  "if (ok) token = getToken()",
  "login(password: getPw())",
  "client(token=get_token())",
  'const h = { Authorization: "Bearer " + pw.env.get("token") }',
  'hopp.request.setHeader("Authorization", "Bearer " + token);',
  "Documentation:\n- token: the refresh token\n- session: optional session name",
  "Token: valid for one hour.",
  // Pagination, tickers and statuses.
  '{"session": "draft", "token": "USDC"}',
  '{"limit": 20, "nextToken": "eyJ2ZXJzaW9uIjoyfQ"}',
  "GET /drive/v3/files?pageToken=CAESBggDEgQIAhAB",
  "- sellToken: WETH\n- buyToken: DAI",
  '{"ClientToken": "a1b2c3d4-run-42"}',
  // Paths and ARNs.
  '{"SecretId": "arn:aws:secretsmanager:us-east-1:1:secret:prod/db"}',
  "POST /v1/projects/p/secrets/db_password:addVersion",
  "POST /v1/session:refresh",
  // Cookie settings and placeholders.
  '{"cookie": {"secure": true, "maxAge": 86400}}',
  "- Cookie: session=<<session_id>>",
  '{"token": "Bearer <<token>>"}',
  "token: >-\n  <<local-ref:secret_1>>",
  // Refs the client minted for a curl user or URL userinfo.
  "curl https://api.stripe.com/v1/charges -u <<local-ref:secret_1>>: -d amount=2000",
  "curl -u <<local-ref:secret_2>>:<<local-ref:secret_1>> https://api.github.com/user",
  "curl -u <<local-ref:secret_1>> https://x",
  'curl_setopt($ch, CURLOPT_USERPWD, "<<local-ref:secret_1>>:");',
  "git clone https://<<local-ref:secret_1>>@github.com/o/r.git",
  'curl -b "session=<<sessionId>>" https://x',
  // Postman templates.
  "GET {{baseUrl}}/users\nX-Api-Key: {{apiKey}}",
  "- X-Api-Key: {{apiKey}}",
  "api_key={{apiKey}}",
  "- token: {{ token }}",
  "password: ${password}",
  // Counts, directories and field names under short keys.
  '{"results":{"pass":42,"fail":1}}',
  "let pass = 0, fail = 0;",
  "PWD=/home/runner/work",
  "GET /search?q=test&key=relevance",
  "- key: Content-Type\n  value: application/json",
  "GET /?sig=v1&expires=123",
  "- Accept-Signature: sha256",
  '{"sig": "sha256"}',
]

describe("replaceSensitiveChatValues", () => {
  test("replaces a named Stripe secret while preserving its variable name", () => {
    const values = new Map<string, string>()
    let sequence = 0
    const content = replaceSensitiveChatValues(
      "Create STRIPE_API_KEY=sk_test_51StripeSecretToken",
      (secret) => {
        const id = `secret_${++sequence}`
        values.set(id, secret)
        return id
      }
    )

    expect(content).toBe("Create STRIPE_API_KEY=<<local-ref:secret_1>>")
    expect(values.get("secret_1")).toBe("sk_test_51StripeSecretToken")
    expect(getLocalSecretReferenceID("<<local-ref:secret_1>>")).toBe("secret_1")
  })

  test("replaces bearer and webhook credentials without leaking their values", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "Authorization: Bearer sk_test_Secret and webhook whsec_Secret",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )

    expect(content).toBe(
      "Authorization: Bearer <<local-ref:secret_1>> and webhook <<local-ref:secret_2>>"
    )
    expect(captured).toEqual(["sk_test_Secret", "whsec_Secret"])
  })

  test("preserves safe environment placeholders", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "STRIPE_API_KEY=<<stripeSecretKey>>",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )

    expect(content).toBe("STRIPE_API_KEY=<<stripeSecretKey>>")
    expect(captured).toEqual([])
  })

  test("does not re-capture an existing local reference", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "add header Authorization: Bearer <<local-ref:secret_1>>",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length + 1}`
      }
    )
    expect(content).toBe(
      "add header Authorization: Bearer <<local-ref:secret_1>>"
    )
    expect(captured).toEqual([])
  })

  test("captures a whole cookie value as one secret", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "add header Cookie: session=abc123; theme=dark",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )
    expect(content).toBe("add header Cookie: <<local-ref:secret_1>>")
    expect(captured).toEqual(["session=abc123; theme=dark"])
  })
})

describe("redactSensitiveChatValues", () => {
  test("removes existing request credentials before context leaves the client", () => {
    expect(
      redactSensitiveChatValues(
        "Authorization: Bearer sk_test_Secret\nwebhook=whsec_Secret"
      )
    ).toBe("Authorization: Bearer [REDACTED]\nwebhook=[REDACTED]")
  })

  test("keeps JSON literals after keyword field names and redacts whole cookie values", () => {
    expect(
      redactSensitiveChatValues(
        '{"secret":true,"password":{"type":"string"}}\nCookie: a=1; b=2\nAuthorization: Basic dXNlcjpwYXNz'
      )
    ).toBe(
      '{"secret":true,"password":{"type":"string"}}\nCookie: [REDACTED]\nAuthorization: Basic [REDACTED]'
    )
  })

  test("redacts bare JWTs but leaves prose and short sk- ids alone", () => {
    expect(
      redactSensitiveChatValues(
        "how do I set a bearer token? eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij /sk-123/items"
      )
    ).toBe("how do I set a bearer token? [REDACTED] /sk-123/items")
  })

  test("stays linear on adversarial whitespace", () => {
    const started = Date.now()
    redactSensitiveChatValues(`password${" ".repeat(200_000)}x`)
    expect(Date.now() - started).toBeLessThan(500)
  })

  test("keeps safe environment placeholders visible in request context", () => {
    expect(
      redactSensitiveChatValues("Authorization: Bearer <<stripeSecretKey>>")
    ).toBe("Authorization: Bearer <<stripeSecretKey>>")
  })

  // Mirrors the backend sanitizeChatContent cases.
  test.each([
    ["password: Summer2024", "password: [REDACTED]"],
    ["- x-api-key: Q3xk9LmP2vR8tY6wZ1aB", "- x-api-key: [REDACTED]"],
    ["- X-API-Key: 4f3c2b1a9e8d7c6b5a4f", "- X-API-Key: [REDACTED]"],
    ["secret=null_but_really_a_secret", "secret=[REDACTED]"],
    ['{"password":"123456Secret!"}', '{"password":"[REDACTED]"}'],
    ['{"api_key":"3fa85f64-5717-4562"}', '{"api_key":"[REDACTED]"}'],
    ['"access_token": "1/fFAGRNJru1FTz7"', '"access_token": "[REDACTED]"'],
    ['{"password":"p@ss w0rd spaces"}', '{"password":"[REDACTED]"}'],
    ["- X-Auth-Token: 9f8e7d6c5b4a", "- X-Auth-Token: [REDACTED]"],
    ["- PRIVATE-TOKEN: glpat-abcdefghijkl", "- PRIVATE-TOKEN: [REDACTED]"],
    ["- X-Vault-Token: hvs.CAESIabc", "- X-Vault-Token: [REDACTED]"],
    ['{"token":"d41d8cd98f00b204"}', '{"token":"[REDACTED]"}'],
    ['{"session_id":"abc123"}', '{"session_id":"[REDACTED]"}'],
    [
      "- Ocp-Apim-Subscription-Key: ab12",
      "- Ocp-Apim-Subscription-Key: [REDACTED]",
    ],
    ["GET /v1?token=abc123&page=2", "GET /v1?token=[REDACTED]&page=2"],
    [
      "GET https://admin:hunter2@api.example.com/v1",
      "GET https://admin:[REDACTED]@api.example.com/v1",
    ],
    [
      '{"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQ\\n-----END PRIVATE KEY-----\\n"}',
      '{"private_key":"[REDACTED]"}',
    ],
    [
      "key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEvQ+/=\n-----END RSA PRIVATE KEY-----\nnext",
      "key:\n[REDACTED]\nnext",
    ],
    ...REDACTED_CASES,
  ])("redacts %s", (input, expected) => {
    expect(redactSensitiveChatValues(input)).toBe(expected)
  })

  test.each([
    "const token = pw.response.body.access_token;",
    "mutation { refresh(token: $token) { accessToken } }",
    "token: {{token}} and api_key=${API_KEY}",
    "max_tokens: 8192, input_tokens: 10, token_type: Bearer",
    "type Login { token: String, user: User! }",
    "GET https://<<user>>:<<pass>>@api.example.com",
    ...UNCHANGED_CASES,
  ])("leaves %s alone", (input) => {
    expect(redactSensitiveChatValues(input)).toBe(input)
  })

  test.each([
    ["-eyJ", "-eyJ".repeat(100_000)],
    ["-eyJ with a segment", "-eyJaaaaaaaaaa".repeat(28_000)],
    ["open quotes", 'password:"'.repeat(40_000)],
    ["URL userinfo", "//a:" + "b:".repeat(190_000)],
    ["PEM headers", "-----BEGIN PRIVATE KEY-----".repeat(14_000)],
    ["closing parens", "token: " + ")".repeat(400_000) + "x"],
    ["header lines", ("\n- " + "a".repeat(115) + "token: x").repeat(3_300)],
    ["GraphQL heads", "query(".repeat(66_000)],
    ["open GraphQL blocks", "query {".repeat(57_000)],
    ["dotted calls", "password=" + "a.".repeat(200_000) + "("],
    ["ref users", " -u " + "<<a>>".repeat(80_000)],
    ["ref userinfo", "//" + "<<a>>".repeat(80_000)],
  ])("stays linear on adversarial %s input", (_name, input) => {
    const started = Date.now()
    redactSensitiveChatValues(input)
    expect(Date.now() - started).toBeLessThan(200)
  })
})

describe("replaceSensitiveChatValues on the widened rules", () => {
  test("captures a whole quoted password, spaces included", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      'set body {"password": "correct horse battery"}',
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )
    expect(content).toBe('set body {"password": "<<local-ref:secret_1>>"}')
    expect(captured).toEqual(["correct horse battery"])
  })

  test("captures a whole header value, & included", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "- password: correct&horse",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )
    expect(content).toBe("- password: <<local-ref:secret_1>>")
    expect(captured).toEqual(["correct&horse"])
  })

  test("captures a dotted token instead of reading it as a script", () => {
    const captured: string[] = []
    replaceSensitiveChatValues(
      "use refresh_token=ya29.a0AfH6SMBxyz",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )
    expect(captured).toEqual(["ya29.a0AfH6SMBxyz"])
  })

  // A ref must hold exactly the credential, or resolving it writes junk.
  test.each([
    ['password: "correct horse battery"', ["correct horse battery"]],
    // Unquoted, a line-start value ends at its first space: prose follows.
    [
      "api_key: 9f8e7d6c5b4a please add it as X-API-Key header",
      ["9f8e7d6c5b4a"],
    ],
    ["password: hunter2 (staging)", ["hunter2"]],
    ["API_KEY=abc123 # staging key", ["abc123"]],
    ["db:\n  password: hunter2 # prod", ["hunter2"]],
    // List entries too, and a scheme word stays with its credential.
    ["- X-Api-Key: 9f8e7d6c5b4a please add it as a header", ["9f8e7d6c5b4a"]],
    ["  - api_key: abc123 # staging", ["abc123"]],
    ["- password: hunter2 (staging)", ["hunter2"]],
    ["X-Auth-Token: Bearer abc123 please add it", ["Bearer abc123"]],
    ["- Authorization: ApiKey VnVhQ2ZHY0JD==", ["VnVhQ2ZHY0JD=="]],
    [
      "Authorization: Bearer sk_test_Secret and webhook whsec_Secret",
      ["sk_test_Secret", "whsec_Secret"],
    ],
    ["token: >-\n  QQ7IdH7fq2w9e8", ["QQ7IdH7fq2w9e8"]],
    ["curl -u admin:S3cr3tP4ss https://api.example.com", ["S3cr3tP4ss"]],
    ['pw.env.set("api_key", "Q3xk9LmP2vR8tY6wZ1aB")', ["Q3xk9LmP2vR8tY6wZ1aB"]],
  ])("captures only the credential in %s", (input, expected) => {
    const captured: string[] = []
    replaceSensitiveChatValues(input, (secret) => {
      captured.push(secret)
      return `secret_${captured.length}`
    })
    expect(captured).toEqual(expected)
  })

  test.each([
    "curl https://api.stripe.com/v1/charges -u sk_test_51StripeSecretToken: -d amount=2000",
    `curl -u ghp_${"x".repeat(36)}:x-oauth-basic https://api.github.com/user`,
    `git clone https://ghp_${"x".repeat(36)}@github.com/o/r.git`,
    "api_key: 9f8e7d6c5b4a please add it as X-API-Key header",
    "API_KEY=abc123 # staging key",
  ])("keeps the refs it mints for %s through a second pass", (input) => {
    let id = 0
    const minted = replaceSensitiveChatValues(input, () => `secret_${++id}`)
    expect(minted).toContain("<<local-ref:secret_1>>")
    expect(redactSensitiveChatValues(minted)).toBe(minted)
    expect(replaceSensitiveChatValues(minted, () => "again")).toBe(minted)
  })

  // The backend cuts user text the same way, so these pass it unchanged.
  test.each([
    "X-Auth-Token: Bearer <<token>>",
    "session_token: Basic <<b64>>",
    "X-Auth-Token: Bearer <<token>> from env",
    "X-Api-Key: <<apiKey>> (from env)",
    "api_key: {{apiKey}} please add it as a header",
    "pass: 3 of 5 tests",
    "- X-Api-Key: <<local-ref:secret_1>> from env",
    "- api_key: {{apiKey}} please add it",
  ])("mints no ref for %s", (input) => {
    expect(replaceSensitiveChatValues(input, () => "minted")).toBe(input)
  })

  test.each([
    "- X-Api-Key: 9f8e7d6c5b4a please add it as a header",
    "X-Auth-Token: Bearer abc123 please add it",
  ])("keeps the ref it mints for %s on a second pass", (input) => {
    const minted = replaceSensitiveChatValues(input, () => "secret_1")
    expect(minted).toContain("<<local-ref:secret_1>> please add it")
    expect(replaceSensitiveChatValues(minted, () => "again")).toBe(minted)
  })

  test("keeps the instruction after a line-start credential", () => {
    expect(
      replaceSensitiveChatValues(
        "api_key: 9f8e7d6c5b4a please add it as X-API-Key header",
        () => "secret_1"
      )
    ).toBe("api_key: <<local-ref:secret_1>> please add it as X-API-Key header")
    // Context keeps redacting the whole line.
    expect(redactSensitiveChatValues("password: hunter2 (staging)")).toBe(
      "password: [REDACTED]"
    )
  })

  test("turns a URL password into a reference the client can resolve", () => {
    const captured: string[] = []
    const content = replaceSensitiveChatValues(
      "set url https://admin:hunter2@api.example.com",
      (secret) => {
        captured.push(secret)
        return `secret_${captured.length}`
      }
    )
    expect(content).toBe(
      "set url https://admin:<<local-ref:secret_1>>@api.example.com"
    )
    expect(captured).toEqual(["hunter2"])
  })
})
