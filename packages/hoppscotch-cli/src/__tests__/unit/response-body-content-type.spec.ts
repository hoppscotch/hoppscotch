import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

import { EffectiveHoppRESTRequest } from "../../interfaces/request";
import { createRequest, requestRunner } from "../../utils/request";

/**
 * Exercises the real axios pipeline — `createRequest`'s response transform
 * included — against a local server, which is the only way to observe the bug
 * in #4957: axios parses any JSON-looking payload regardless of the response
 * content type, so mocking axios away hides the mechanism entirely.
 */

const JSON_PAYLOAD = '{"test": "123"}';
const JSON_CONTENT_TYPE = "application/json";
const BINARY_CONTENT_TYPE = "application/octet-stream";
const OK_STATUS = 200;
const SERVER_ERROR_STATUS = 500;
// Port 0 lets the OS pick a free port, so the suite cannot collide in CI.
const EPHEMERAL_PORT = 0;
const LOOPBACK_HOST = "127.0.0.1";

let server: Server | undefined;

const serve = async (
  contentType: string,
  body: string,
  status: number = OK_STATUS
): Promise<string> => {
  server = createServer((_request, response) => {
    response.writeHead(status, { "content-type": contentType });
    response.end(body);
  });

  await new Promise<void>((resolve) =>
    server!.listen(EPHEMERAL_PORT, LOOPBACK_HOST, resolve)
  );

  const { port } = server.address() as AddressInfo;
  return `http://${LOOPBACK_HOST}:${port}`;
};

const runAgainst = async (endpoint: string) => {
  const request = {
    v: "1",
    name: "response-body-content-type",
    method: "GET",
    endpoint,
    params: [],
    headers: [],
    preRequestScript: "",
    testScript: "",
    auth: { authActive: false, authType: "none" },
    body: { contentType: null, body: null },
    requestVariables: [],
    effectiveFinalURL: endpoint,
    effectiveFinalHeaders: [],
    effectiveFinalParams: [],
    effectiveFinalBody: null,
    effectiveFinalRequestVariables: [],
  } as unknown as EffectiveHoppRESTRequest;

  return requestRunner(createRequest(request))();
};

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
});

describe("response body exposed to test scripts", () => {
  // Regression guard for #4957: a JSON-looking payload served under a non-JSON
  // content type reached scripts as an object, so `JSON.parse(pw.response.body)`
  // threw `"[object Object]" is not valid JSON` in the CLI while the same
  // collection passed in the web app.
  it("is the raw string when the content type is not JSON", async () => {
    const endpoint = await serve(BINARY_CONTENT_TYPE, JSON_PAYLOAD);

    const result = await runAgainst(endpoint);

    expect(result).toMatchObject({
      _tag: "Right",
      right: { body: JSON_PAYLOAD },
    });
  });

  it("is the parsed object when the content type is JSON", async () => {
    const endpoint = await serve(JSON_CONTENT_TYPE, JSON_PAYLOAD);

    const result = await runAgainst(endpoint);

    expect(result).toMatchObject({
      _tag: "Right",
      right: { body: { test: "123" } },
    });
  });

  it("is the raw string for a non-JSON error response", async () => {
    const endpoint = await serve(
      "text/plain",
      JSON_PAYLOAD,
      SERVER_ERROR_STATUS
    );

    const result = await runAgainst(endpoint);

    expect(result).toMatchObject({
      _tag: "Right",
      right: { body: JSON_PAYLOAD, status: SERVER_ERROR_STATUS },
    });
  });
});
