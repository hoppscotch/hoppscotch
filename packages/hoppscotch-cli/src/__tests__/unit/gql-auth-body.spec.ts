import { describe, expect, test, vi } from "vitest";
import { Environment, HoppGQLRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";

import { preProcessGQLRequest } from "../../utils/gql-request";

// Capture what the signer is constructed with — the signature has to be
// computed over the body actually sent, not the stub placeholder
const signerCalls = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock("aws4fetch", () => ({
  AwsV4Signer: class {
    constructor(opts: Record<string, unknown>) {
      signerCalls.push(opts);
    }
    async sign() {
      return { headers: new Map(), url: new URL("https://example.com") };
    }
  },
}));

const { getEffectiveRESTRequest } = await import("../../utils/pre-request");

const collection = {
  v: 12,
  name: "Base",
  folders: [],
  requests: [],
  headers: [],
  auth: { authType: "none", authActive: false },
  variables: [],
  preRequestScript: "",
  testScript: "",
} as any;

const gqlRequest = {
  v: 10,
  name: "Signed GQL",
  url: "https://example.com/graphql",
  headers: [],
  query: "query Hello { hello }",
  variables: '{ "id": "1" }',
  auth: {
    authType: "aws-signature",
    authActive: true,
    accessKey: "AKIAEXAMPLE",
    secretKey: "secret",
    region: "us-east-1",
    serviceName: "execute-api",
    serviceToken: "",
    addTo: "HEADERS",
  },
  description: null,
  responses: {},
  preRequestScript: "",
  testScript: "",
} as unknown as HoppGQLRequest;

const emptyEnv: Environment = {
  v: 2,
  id: "env",
  name: "env",
  variables: [],
};

describe("GraphQL requests with signing auth", () => {
  test("aws-signature signs the assembled GraphQL payload, not the empty stub body", async () => {
    signerCalls.length = 0;

    const stub = preProcessGQLRequest(gqlRequest, collection);
    // The stub carries a placeholder body until effective-request time
    expect(stub.body.body).toBe("");

    const result = await getEffectiveRESTRequest(stub, emptyEnv);
    expect(E.isRight(result)).toBe(true);

    expect(signerCalls).toHaveLength(1);
    const signedBody = signerCalls[0].body as string;

    expect(JSON.parse(signedBody)).toEqual({
      query: "query Hello { hello }",
      variables: { id: "1" },
      operationName: "Hello",
    });
  });
});
