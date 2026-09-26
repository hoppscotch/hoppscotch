import { describe, expect, test } from "vitest";
import { Environment, makeRESTRequest } from "@hoppscotch/data";
import * as E from "fp-ts/Either";

import { getEffectiveRESTRequest } from "../../utils/pre-request";

const env: Environment = {
  v: 2,
  id: "env",
  name: "env",
  variables: [
    {
      key: "host",
      initialValue: "example.com",
      currentValue: "example.com",
      secret: false,
    },
  ],
};

const requestWithBody = (
  contentType: "application/json" | "text/plain",
  body: string
) =>
  makeRESTRequest({
    name: "request",
    method: "POST",
    endpoint: "https://example.com",
    params: [],
    headers: [],
    preRequestScript: "",
    testScript: "",
    auth: { authActive: false, authType: "none" },
    body: { contentType, body },
    requestVariables: [],
    description: null,
    responses: {},
  });

describe("getEffectiveRESTRequest - body variables", () => {
  test("resolves known variables in a JSON body that also references an undefined one", async () => {
    const request = requestWithBody(
      "application/json",
      '{"url": "https://<<host>>", "note": "<<notDefined>>"}'
    );

    const result = await getEffectiveRESTRequest(request, env);

    expect(E.isRight(result)).toBe(true);
    if (E.isLeft(result)) return;

    expect(
      JSON.parse(result.right.effectiveRequest.effectiveFinalBody as string)
    ).toEqual({
      url: "https://example.com",
      note: "<<notDefined>>",
    });
  });

  test("resolves known variables in a plain text body that also references an undefined one", async () => {
    const request = requestWithBody("text/plain", "<<host>> <<notDefined>>");

    const result = await getEffectiveRESTRequest(request, env);

    expect(E.isRight(result)).toBe(true);
    if (E.isLeft(result)) return;

    expect(result.right.effectiveRequest.effectiveFinalBody).toBe(
      "example.com <<notDefined>>"
    );
  });

  test("still reports variables that reference each other in a loop", async () => {
    const loopEnv: Environment = {
      ...env,
      variables: [
        {
          key: "a",
          initialValue: "<<b>>",
          currentValue: "<<b>>",
          secret: false,
        },
        {
          key: "b",
          initialValue: "<<a>>",
          currentValue: "<<a>>",
          secret: false,
        },
      ],
    };

    const result = await getEffectiveRESTRequest(
      requestWithBody("text/plain", "<<a>>"),
      loopEnv
    );

    expect(E.isLeft(result)).toBe(true);
    if (E.isRight(result)) return;

    expect(result.left).toMatchObject({ code: "PARSING_ERROR" });
    expect(JSON.stringify(result.left)).toContain("ENV_EXPAND_LOOP");
  });
});
