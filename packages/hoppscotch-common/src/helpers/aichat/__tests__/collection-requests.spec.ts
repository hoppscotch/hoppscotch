import { describe, expect, test } from "vitest"
import {
  buildCollectionRequest,
  parseCollectionRequestDefinitions,
} from "../collection-requests"
import { APP_ACTION_TOOLS } from "../app-actions"

describe("collection request definitions", () => {
  test("registers collection construction and verification as app actions", () => {
    expect(APP_ACTION_TOOLS.has("add_or_update_collection_requests")).toBe(true)
    expect(APP_ACTION_TOOLS.has("run_collection")).toBe(true)
  })

  test("builds a complete request with scripts and form body", () => {
    const parsed = parseCollectionRequestDefinitions([
      {
        name: "Create Payment Intent",
        method: "POST",
        url: "<<baseUrl>>/v1/payment_intents",
        headers: [
          { key: "Authorization", value: "Bearer <<stripeSecretKey>>" },
        ],
        params: [{ key: "expand[]", value: "latest_charge" }],
        body: "amount=2000&currency=usd",
        contentType: "application/x-www-form-urlencoded",
        testScript:
          'pw.test("created", () => pw.expect(pw.response.status).toBe(200))',
      },
    ])

    expect("error" in parsed).toBe(false)
    if ("error" in parsed) return

    const request = buildCollectionRequest(parsed.definitions[0])

    expect(request).toMatchObject({
      name: "Create Payment Intent",
      method: "POST",
      endpoint: "<<baseUrl>>/v1/payment_intents",
      headers: [
        {
          key: "Authorization",
          value: "Bearer <<stripeSecretKey>>",
          active: true,
        },
      ],
      params: [{ key: "expand[]", value: "latest_charge", active: true }],
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: "amount=2000&currency=usd",
      },
    })
    expect(request.testScript).toContain("pw.response.status")
  })

  test("retains stable data when replacing an existing request", () => {
    const original = buildCollectionRequest({
      name: "Create Payment Intent",
      method: "POST",
      url: "https://old.example.com",
      headers: [],
      params: [],
      testScript: "old test",
    })
    original.id = "request-id"
    original._ref_id = "request-ref"
    original.description = "Keep this description"
    original.responses = { "200": [] }
    original.auth = {
      authActive: true,
      authType: "bearer",
      token: "<<stripeSecretKey>>",
    }
    original.requestVariables = [
      { key: "customerId", value: "cus_123", active: true },
    ]
    original.headers = [
      {
        key: "Idempotency-Key",
        value: "<<$guid>>",
        active: true,
        description: "",
      },
    ]
    original.params = [
      {
        key: "expand[]",
        value: "latest_charge",
        active: true,
        description: "",
      },
    ]
    original.body = {
      contentType: "application/x-www-form-urlencoded",
      body: "amount=2000&currency=usd",
    }
    original.preRequestScript = "original pre-request"

    const updated = buildCollectionRequest(
      {
        name: "Create Payment Intent",
        method: "POST",
        url: "<<baseUrl>>/v1/payment_intents",
        body: "amount=3000&currency=usd",
      },
      original
    )

    expect(updated).toMatchObject({
      id: "request-id",
      _ref_id: "request-ref",
      description: "Keep this description",
      responses: { "200": [] },
      auth: {
        authActive: true,
        authType: "bearer",
        token: "<<stripeSecretKey>>",
      },
      requestVariables: [{ key: "customerId", value: "cus_123", active: true }],
      headers: [
        {
          key: "Idempotency-Key",
          value: "<<$guid>>",
          active: true,
        },
      ],
      params: [{ key: "expand[]", value: "latest_charge", active: true }],
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: "amount=3000&currency=usd",
      },
      preRequestScript: "original pre-request",
      endpoint: "<<baseUrl>>/v1/payment_intents",
      testScript: "old test",
    })
  })

  test("rejects an invalid batch before any request is built", () => {
    expect(
      parseCollectionRequestDefinitions([
        {
          name: "Create Payment Intent",
          method: "POST",
          url: "https://api.stripe.com/v1/payment_intents",
        },
        {
          name: "create payment intent",
          method: "POST",
          url: "https://api.stripe.com/v1/payment_intents",
        },
      ])
    ).toEqual({
      error:
        'Request names must be unique; "create payment intent" is repeated.',
    })

    expect(
      parseCollectionRequestDefinitions([
        {
          name: "List Payment Intents",
          method: "GET",
          url: "https://api.stripe.com/v1/payment_intents",
          headers: [{ key: "", value: "invalid" }],
        },
      ])
    ).toEqual({
      error:
        "Request 1 headers must contain non-empty string keys and string values.",
    })
  })
})
