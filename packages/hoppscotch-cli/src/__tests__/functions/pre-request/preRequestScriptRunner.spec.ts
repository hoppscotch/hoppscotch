import { describe, test, expect, beforeAll } from "vitest";
import { HoppRESTRequest } from "@hoppscotch/data";
import { HoppEnvs } from "../../../types/request";
import * as E from "fp-ts/Either";
import { HoppCLIError } from "../../../types/errors";
import { EffectiveHoppRESTRequest } from "../../../interfaces/request";
import { preRequestScriptRunner } from "../../../utils/pre-request";

import "@relmify/jest-fp-ts";

const SAMPLE_ENVS: HoppEnvs = {
  global: [],
  selected: [],
};
const VALID_PRE_REQUEST_SCRIPT = `
	pw.env.set("ENDPOINT","https://example.com");
`;
const INVALID_PRE_REQUEST_SCRIPT = "d";
const SAMPLE_REQUEST: HoppRESTRequest = {
  v: "1",
  name: "request",
  method: "GET",
  endpoint: "<<ENDPOINT>>",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: { authActive: false, authType: "none" },
  body: {
    contentType: null,
    body: null,
  },
  requestVariables: [],
};

describe("preRequestScriptRunner", () => {
  let SUCCESS_PRE_REQUEST_RUNNER: E.Either<
      HoppCLIError,
      { effectiveRequest: EffectiveHoppRESTRequest; updatedEnvs: HoppEnvs }
    >,
    FAILURE_PRE_REQUEST_RUNNER: E.Either<
      HoppCLIError,
      { effectiveRequest: EffectiveHoppRESTRequest; updatedEnvs: HoppEnvs }
    >;

  beforeAll(async () => {
    SAMPLE_REQUEST.preRequestScript = VALID_PRE_REQUEST_SCRIPT;
    SUCCESS_PRE_REQUEST_RUNNER = await preRequestScriptRunner(
      SAMPLE_REQUEST,
      SAMPLE_ENVS,
      false
    )();

    SAMPLE_REQUEST.preRequestScript = INVALID_PRE_REQUEST_SCRIPT;
    FAILURE_PRE_REQUEST_RUNNER = await preRequestScriptRunner(
      SAMPLE_REQUEST,
      SAMPLE_ENVS,
      false
    )();
  });

  test("Parsing of request endpoint with set ENV.", () => {
    expect(SUCCESS_PRE_REQUEST_RUNNER).toSubsetEqualRight({
      effectiveRequest: {
        effectiveFinalURL: "https://example.com",
      },
    });
  });

  test("Failed execution due to unknown variable error.", () => {
    expect(FAILURE_PRE_REQUEST_RUNNER).toSubsetEqualLeft(<HoppCLIError>{
      code: "PRE_REQUEST_SCRIPT_ERROR",
    });
  });
});
