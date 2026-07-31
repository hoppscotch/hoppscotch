import { Environment, HoppRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";
import { describe, expect, test } from "vitest";

import { getEffectiveRESTRequest } from "../../utils/pre-request";

const DEFAULT_ENV = <Environment>{
  name: "name",
  variables: [],
};

const baseRequest = (auth: HoppRESTRequest["auth"]): HoppRESTRequest =>
  <HoppRESTRequest>{
    v: "1",
    name: "name",
    method: "GET",
    endpoint: "https://example.com",
    params: [],
    headers: [],
    requestVariables: [],
    preRequestScript: "",
    testScript: "",
    auth,
    body: { contentType: null, body: null },
  };

describe("getEffectiveRESTRequest - AWS Signature credential modes", () => {
  test("rejects profile credential mode (requires the desktop app)", async () => {
    const request = baseRequest({
      authActive: true,
      authType: "aws-signature",
      accessKey: "",
      secretKey: "",
      region: "",
      serviceName: "s3",
      serviceToken: "",
      addTo: "HEADERS",
      credentialMode: "profile",
      profileName: "prod",
    });

    const result = await getEffectiveRESTRequest(request, DEFAULT_ENV);

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.code).toBe("REQUEST_ERROR");
    }
  });

  test("still signs with manual credential mode", async () => {
    const request = baseRequest({
      authActive: true,
      authType: "aws-signature",
      accessKey: "AKIA",
      secretKey: "secret",
      region: "us-east-1",
      serviceName: "s3",
      serviceToken: "",
      addTo: "HEADERS",
      credentialMode: "manual",
      profileName: "",
    });

    const result = await getEffectiveRESTRequest(request, DEFAULT_ENV);

    expect(E.isRight(result)).toBe(true);
  });
});
