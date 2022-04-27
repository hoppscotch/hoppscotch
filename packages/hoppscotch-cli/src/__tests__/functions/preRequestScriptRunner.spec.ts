import { HoppRESTRequest } from "@hoppscotch/data";
import { HoppEnvs } from "../../types/request";
import * as E from "fp-ts/Either";
import { HoppCLIError, HoppErrorCode } from "../../types/errors";
import { EffectiveHoppRESTRequest } from "../../interfaces/request";
import { preRequestScriptRunner } from "../../utils/pre-request";

import "@relmify/jest-fp-ts";

const SAMPLE_ENVS: HoppEnvs = {
  global: [{ key: "GLOBAL", value: "devblin" }],
  selected: [{ key: "LOCAL", value: "local" }],
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
};

describe("preRequestScriptRunner", () => {
  let SUCCESS_PRE_REQUEST_RUNNER: E.Either<
      HoppCLIError,
      EffectiveHoppRESTRequest
    >,
    FAILURE_PRE_REQUEST_RUNNER: E.Either<
      HoppCLIError,
      EffectiveHoppRESTRequest
    >;

  beforeAll(async () => {
    SAMPLE_REQUEST.preRequestScript = VALID_PRE_REQUEST_SCRIPT;
    SUCCESS_PRE_REQUEST_RUNNER = await preRequestScriptRunner(
      SAMPLE_REQUEST,
      SAMPLE_ENVS
    )();

    SAMPLE_REQUEST.preRequestScript = INVALID_PRE_REQUEST_SCRIPT;
    FAILURE_PRE_REQUEST_RUNNER = await preRequestScriptRunner(
      SAMPLE_REQUEST,
      SAMPLE_ENVS
    )();
  });

  it("Should have parsed request endpoint with set ENV.", () => {
    expect(SUCCESS_PRE_REQUEST_RUNNER).toBeRight();
    if (E.isRight(SUCCESS_PRE_REQUEST_RUNNER)) {
      const { effectiveFinalURL } = SUCCESS_PRE_REQUEST_RUNNER.right;

      expect(effectiveFinalURL).toStrictEqual("https://example.com");
    }
  });

  it("Should fail to execute with unknown variable error.", () => {
    expect(FAILURE_PRE_REQUEST_RUNNER).toBeLeft();
    if (E.isLeft(FAILURE_PRE_REQUEST_RUNNER)) {
      const error = FAILURE_PRE_REQUEST_RUNNER.left;

      expect(error.code).toBe<HoppErrorCode>("PRE_REQUEST_SCRIPT_ERROR");
    }
  });
});
