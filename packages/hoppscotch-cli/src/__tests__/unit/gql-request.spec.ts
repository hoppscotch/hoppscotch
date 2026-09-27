import { describe, expect, test } from "vitest";
import {
  EnvironmentVariable,
  HoppCollection,
  HoppGQLRequest,
} from "@hoppscotch/data";
import * as E from "fp-ts/Either";

import {
  GQLStubRequest,
  buildEffectiveGQLPayload,
  isGQLStubRequest,
  preProcessGQLRequest,
} from "../../utils/gql-request";

const baseCollection = {
  v: 12,
  name: "Base",
  folders: [],
  requests: [],
  headers: [],
  auth: { authType: "none", authActive: false },
  variables: [],
  preRequestScript: "",
  testScript: "",
} as unknown as HoppCollection;

const baseRequest: HoppGQLRequest = {
  v: 10,
  name: "Get Hello",
  url: "https://echo.hoppscotch.io/graphql",
  headers: [],
  query: "query HelloOp { hello }",
  variables: '{ "id": "1" }',
  auth: { authType: "none", authActive: true },
  description: null,
  responses: {},
  preRequestScript: 'pw.env.set("a", "b")',
  testScript: 'pw.test("t", () => {})',
};

const envs = (vars: Record<string, string>): EnvironmentVariable[] =>
  Object.entries(vars).map(([key, value]) => ({
    key,
    initialValue: value,
    currentValue: value,
    secret: false,
  }));

const stubFor = (
  request: Partial<HoppGQLRequest>,
  collection: HoppCollection = baseCollection
): GQLStubRequest =>
  preProcessGQLRequest({ ...baseRequest, ...request } as HoppGQLRequest, collection);

const payloadFor = (
  request: Partial<HoppGQLRequest>,
  variables: EnvironmentVariable[] = [],
  collection: HoppCollection = baseCollection
) => {
  const result = buildEffectiveGQLPayload(
    stubFor(request, collection),
    variables
  );
  expect(E.isRight(result)).toBe(true);
  return JSON.parse((result as E.Right<string>).right);
};

describe("preProcessGQLRequest", () => {
  test("builds a REST-shaped POST stub carrying scripts and the raw query/variables", () => {
    const stub = stubFor({});

    expect(stub.method).toBe("POST");
    expect(stub.endpoint).toBe("https://echo.hoppscotch.io/graphql");
    expect(stub.body.contentType).toBe("application/json");
    expect(stub.preRequestScript).toBe('pw.env.set("a", "b")');
    expect(stub.testScript).toBe('pw.test("t", () => {})');
    expect(stub.gqlRaw).toEqual({
      query: "query HelloOp { hello }",
      variables: '{ "id": "1" }',
    });
    expect(isGQLStubRequest(stub)).toBe(true);
  });

  test("falls back to 'Untitled Request' for unnamed requests", () => {
    expect(stubFor({ name: "" }).name).toBe("Untitled Request");
  });

  test("an inactive request header does not suppress a same-key active parent header", () => {
    const collection = {
      ...baseCollection,
      headers: [
        { key: "x-parent", value: "parent-value", active: true, description: "" },
      ],
    } as HoppCollection;

    const stub = stubFor(
      {
        headers: [
          { key: "x-parent", value: "child-value", active: false, description: "" },
        ],
      },
      collection
    );

    expect(stub.headers).toEqual([
      { key: "x-parent", value: "parent-value", active: true, description: "" },
    ]);
  });

  test("an active request header wins over a same-key parent header; inactive parents are dropped", () => {
    const collection = {
      ...baseCollection,
      headers: [
        { key: "x-shared", value: "parent-value", active: true, description: "" },
        { key: "x-off", value: "off", active: false, description: "" },
      ],
    } as HoppCollection;

    const stub = stubFor(
      {
        headers: [
          { key: "x-shared", value: "child-value", active: true, description: "" },
        ],
      },
      collection
    );

    expect(stub.headers).toEqual([
      { key: "x-shared", value: "child-value", active: true, description: "" },
    ]);
  });

  test("auth inherit + active resolves to the parent auth", () => {
    const collection = {
      ...baseCollection,
      auth: { authType: "bearer", token: "parent-token", authActive: true },
    } as HoppCollection;

    const stub = stubFor(
      { auth: { authType: "inherit", authActive: true } },
      collection
    );

    expect(stub.auth).toEqual({
      authType: "bearer",
      token: "parent-token",
      authActive: true,
    });
  });

  test("auth inherit + inactive resolves to no auth even when the parent has auth", () => {
    const collection = {
      ...baseCollection,
      auth: { authType: "bearer", token: "parent-token", authActive: true },
    } as HoppCollection;

    const stub = stubFor(
      { auth: { authType: "inherit", authActive: false } },
      collection
    );

    expect(stub.auth).toEqual({ authType: "none", authActive: false });
  });

  test("explicit request-level auth is carried onto the stub", () => {
    const stub = stubFor({
      auth: { authType: "bearer", token: "req-token", authActive: true },
    });

    expect(stub.auth).toEqual({
      authType: "bearer",
      token: "req-token",
      authActive: true,
    });
  });
});

describe("buildEffectiveGQLPayload", () => {
  test("assembles query, parsed variables, and operationName for a named operation", () => {
    const payload = payloadFor({});

    expect(payload).toEqual({
      query: "query HelloOp { hello }",
      variables: { id: "1" },
      operationName: "HelloOp",
    });
  });

  test("omits operationName for anonymous operations", () => {
    const payload = payloadFor({ query: "{ hello }" });

    expect(payload.operationName).toBeUndefined();
  });

  test("selects the first operation of a multi-operation document", () => {
    const payload = payloadFor({
      query: "query First { a }\nquery Second { b }",
    });

    expect(payload.operationName).toBe("First");
  });

  test("an anonymous FIRST operation in a multi-op document sends no operationName (server reports the spec error)", () => {
    const payload = payloadFor({
      query: "{ a }\nquery Second { b }",
    });

    expect(payload.operationName).toBeUndefined();
  });

  test("resolves env templates in bare non-string variable positions", () => {
    const payload = payloadFor(
      { variables: '{ "count": <<n>> }' },
      envs({ n: "5" })
    );

    expect(payload.variables).toEqual({ count: 5 });
  });

  test("a multi-line env value as the whole query document survives intact", () => {
    const doc = "query FromEnv {\n  method\n  url\n}";
    const payload = payloadFor(
      { query: "<<doc>>", variables: "" },
      envs({ doc })
    );

    expect(payload.query).toBe(doc);
    expect(payload.operationName).toBe("FromEnv");
  });

  test("safe env values substitute into variables string positions", () => {
    const payload = payloadFor(
      { variables: '{ "m": "<<v>> from CLI" }' },
      envs({ v: "hello-world" })
    );

    expect(payload.variables.m).toBe("hello-world from CLI");
  });

  test("env values that break the variables JSON fail loudly instead of sending a mangled body", () => {
    // Substitution into `variables` is textual, so a raw quote in the value
    // breaks the JSON — the app fails this identically
    const result = buildEffectiveGQLPayload(
      stubFor({ variables: '{ "m": "<<v>>" }' }),
      envs({ v: 'has a "quote"' })
    );

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(String(result.left.data)).toContain("Invalid JSON");
    }
  });

  test("a literal subscription fails with REQUEST_ERROR before any network call", () => {
    const result = buildEffectiveGQLPayload(
      stubFor({ query: "subscription S { countdown }" }),
      []
    );

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.code).toBe("REQUEST_ERROR");
      expect(String(result.left.data)).toContain(
        "GraphQL subscriptions are not supported"
      );
    }
  });

  test("a templated document resolving to a subscription is detected after substitution", () => {
    const result = buildEffectiveGQLPayload(
      stubFor({ query: "<<subdoc>>" }),
      envs({ subdoc: "subscription S { countdown }" })
    );

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.code).toBe("REQUEST_ERROR");
    }
  });

  test("invalid variables JSON fails with REQUEST_ERROR instead of sending a mangled body", () => {
    const result = buildEffectiveGQLPayload(
      stubFor({ variables: '{ "m": broken' }),
      []
    );

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.code).toBe("REQUEST_ERROR");
      expect(String(result.left.data)).toContain("Invalid JSON");
    }
  });

  test("empty variables text omits the variables key entirely", () => {
    const payload = payloadFor({ variables: "" });

    expect("variables" in payload).toBe(false);
  });

  test("whitespace-only variables fail as invalid JSON (app kernel parity)", () => {
    const result = buildEffectiveGQLPayload(stubFor({ variables: "   " }), []);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(String(result.left.data)).toContain("Invalid JSON");
    }
  });

  test("empty and fragment-only documents are sent as-is without operationName", () => {
    expect(payloadFor({ query: "", variables: "" })).toEqual({ query: "" });

    const fragmentOnly = "fragment F on Query { method }";
    const payload = payloadFor({ query: fragmentOnly });
    expect(payload.query).toBe(fragmentOnly);
    expect(payload.operationName).toBeUndefined();
  });

  test("an unparseable document is sent as-is for the server to report", () => {
    const payload = payloadFor({ query: "query { unbalanced" });

    expect(payload.query).toBe("query { unbalanced");
    expect(payload.operationName).toBeUndefined();
  });
});
