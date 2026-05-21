import { describe, test, expect, beforeEach } from "vitest";
import { Environment, HoppRESTRequest } from "@hoppscotch/data";
import { EffectiveHoppRESTRequest } from "../../../interfaces/request";
import { HoppCLIError } from "../../../types/errors";
import { getEffectiveRESTRequest } from "../../../utils/pre-request";

import "@relmify/jest-fp-ts";

const DEFAULT_ENV = <Environment>{
  name: "name",
  variables: [
    {
      key: "HEADER",
      initialValue: "parsed_header",
      currentValue: "parsed_header",
      secret: false,
    },
    { key: "PARAM", initialValue: "parsed_param", currentValue: "parsed_param", secret: false },
    { key: "TOKEN", initialValue: "parsed_token", currentValue: "parsed_token", secret: false },
    { key: "BODY_PROP", initialValue: "parsed_body_prop", currentValue: "parsed_body_prop", secret: false },
    { key: "ENDPOINT", initialValue: "https://parsed-endpoint.com", currentValue: "https://parsed-endpoint.com", secret: false },
  ],
};

const DEFAULT_REQUEST = <HoppRESTRequest>{
  v: "1",
  name: "name",
  method: "GET",
  endpoint: "https://example.com",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: {
    authActive: false,
    authType: "none",
  },
  body: {
    contentType: null,
    body: null,
  },
  requestVariables: [],
};

describe("getEffectiveRESTRequest", () => {
  let SAMPLE_REQUEST = Object.assign({}, DEFAULT_REQUEST);

  beforeEach(() => {
    SAMPLE_REQUEST = Object.assign({}, DEFAULT_REQUEST);
  });

  test("Endpoint, headers and params with unavailable ENV.", async () => {
    SAMPLE_REQUEST.headers = [
      {
        key: "HEADER",
        value: "<<UNKNOWN>>",
        active: true,
      },
    ];
    SAMPLE_REQUEST.params = [
      {
        key: "PARAM",
        value: "<<UNKNOWN>>",
        active: true,
      },
    ];
    SAMPLE_REQUEST.endpoint = "<<UNKNOWN>>";

    const result = await getEffectiveRESTRequest(SAMPLE_REQUEST, DEFAULT_ENV);
    expect(result).toSubsetEqualRight({
      effectiveRequest: {
        effectiveFinalHeaders: [{ active: true, key: "HEADER", value: "" }],
        effectiveFinalParams: [{ active: true, key: "PARAM", value: "" }],
        effectiveFinalURL: "",
      },
    });
  });

  test("Auth with unavailable ENV.", async () => {
    SAMPLE_REQUEST.auth = {
      authActive: true,
      authType: "bearer",
      token: "<<UNKNOWN>>",
    };

    const result = await getEffectiveRESTRequest(SAMPLE_REQUEST, DEFAULT_ENV);
    expect(result).toSubsetEqualRight({
      effectiveRequest: {
        effectiveFinalHeaders: [
          { active: true, key: "Authorization", value: "Bearer " },
        ],
      },
    });
  });

  test("Body with unavailable ENV.", async () => {
    SAMPLE_REQUEST.body = {
      contentType: "text/plain",
      body: "<<UNKNOWN>>",
    };

    const result = await getEffectiveRESTRequest(SAMPLE_REQUEST, DEFAULT_ENV);
    expect(result).toSubsetEqualLeft(<HoppCLIError>{
      code: "PARSING_ERROR",
    });
  });

  test("Request meta-data with available ENVs.", async () => {
    SAMPLE_REQUEST.headers = [
      {
        key: "HEADER",
        value: "<<HEADER>>",
        active: true,
      },
    ];
    SAMPLE_REQUEST.params = [
      {
        key: "PARAM",
        value: "<<PARAM>>",
        active: true,
      },
    ];
    SAMPLE_REQUEST.endpoint = "<<ENDPOINT>>";
    SAMPLE_REQUEST.auth = {
      authActive: true,
      authType: "bearer",
      token: "<<TOKEN>>",
    };
    SAMPLE_REQUEST.body = {
      contentType: "text/plain",
      body: "<<BODY_PROP>>",
    };

    const vars = DEFAULT_ENV.variables;

    const result = await getEffectiveRESTRequest(SAMPLE_REQUEST, DEFAULT_ENV);
    expect(result).toSubsetEqualRight({
      effectiveRequest: {
        effectiveFinalHeaders: [
          { active: true, key: "HEADER", value: vars[0].currentValue },
          {
            active: true,
            key: "Authorization",
            value: `Bearer ${vars[2].currentValue}`,
          },
          { active: true, key: "Content-Type", value: "text/plain" },
        ],
        effectiveFinalParams: [
          { active: true, key: "PARAM", value: vars[1].currentValue },
        ],
        effectiveFinalURL: vars[4].currentValue,
        effectiveFinalBody: vars[3].currentValue,
      },
    });
  });
});
