import { ExecException } from "child_process";

import { HoppErrorCode } from "../../types/errors";
import { runCLI, getErrorCode, getTestJsonFilePath } from "../utils";

describe("Test 'hopp test <file>' command:", () => {
  describe("Supplied collection export file validations", () => {
    test("No collection file path provided.", async () => {
      const args = "test";
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Collection file not found.", async () => {
      const args = "test notfound.json";
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
    });

    test("Collection file is invalid JSON.", async () => {
      const args = `test ${getTestJsonFilePath("malformed-collection.json")}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("UNKNOWN_ERROR");
    });

    test("Malformed collection file.", async () => {
      const args = `test ${getTestJsonFilePath("malformed-collection2.json")}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("MALFORMED_COLLECTION");
    });

    test("Invalid arguement.", async () => {
      const args = "invalid-arg";
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Collection file not JSON type.", async () => {
      const args = `test ${getTestJsonFilePath("notjson.txt")}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
    });

    test("Fails if the collection file includes scripts with incorrect API usage and failed assertions", async () => {
      const args = `test ${getTestJsonFilePath("fails.json")}`;
      const { error } = await runCLI(args);

      expect(error).not.toBeNull();
      expect(error).toMatchObject(<ExecException>{
        code: 1,
      });
    });
  });

  test("Successfully processes a supplied collection export file of the expected format", async () => {
    const args = `test ${getTestJsonFilePath("passes.json")}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });

  test("Supports inheriting headers and authorization set at the root collection", async () => {
    const args = `test ${getTestJsonFilePath(
      "collection-level-headers-auth.json"
    )}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });

  test("Persists environment variables set in the pre-request script for consumption in the test script", async () => {
    const args = `test ${getTestJsonFilePath(
      "pre-req-script-env-var-persistence-coll.json"
    )}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });
});

describe("Test 'hopp test <file> --env <file>' command:", () => {
  describe("Supplied environment export file validations", () => {
    const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes.json")}`;

    test("No env file path provided.", async () => {
      const args = `${VALID_TEST_ARGS} --env`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("ENV file not JSON type.", async () => {
      const args = `${VALID_TEST_ARGS} --env ${getTestJsonFilePath(
        "notjson.txt"
      )}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
    });

    test("ENV file not found.", async () => {
      const args = `${VALID_TEST_ARGS} --env notfound.json`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
    });

    test("Throws an error on supplying a malformed environment export file", async () => {
      const ENV_PATH = getTestJsonFilePath("malformed-envs.json");
      const args = `${VALID_TEST_ARGS} --env ${ENV_PATH}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("MALFORMED_ENV_FILE");
    });

    test("Throws an error on supplying an environment export file based on the bulk environment export format", async () => {
      const ENV_PATH = getTestJsonFilePath("bulk-envs.json");
      const args = `${VALID_TEST_ARGS} --env ${ENV_PATH}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("BULK_ENV_FILE");
    });
  });

  test("Correctly resolves values from the supplied environment export file", async () => {
    const TESTS_PATH = getTestJsonFilePath("env-flag-tests.json");
    const ENV_PATH = getTestJsonFilePath("env-flag-envs.json");
    const args = `test ${TESTS_PATH} --env ${ENV_PATH}`;

    const { error } = await runCLI(args);
    expect(error).toBeNull();
  });

  test("Correctly resolves environment variables referenced in the request body", async () => {
    const COLL_PATH = getTestJsonFilePath("req-body-env-vars-coll.json");
    const ENVS_PATH = getTestJsonFilePath("req-body-env-vars-envs.json");
    const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

    const { error } = await runCLI(args);
    expect(error).toBeNull();
  });

  describe("Secret environment variables", () => {
    jest.setTimeout(10000);

    // Reads secret environment values from system environment
    test("Correctly picks the values for secret environment variables from `process.env` and persists the variables set from the pre-request script", async () => {
      const env = {
        ...process.env,
        secretBearerToken: "test-token",
        secretBasicAuthUsername: "test-user",
        secretBasicAuthPassword: "test-pass",
        secretQueryParamValue: "secret-query-param-value",
        secretBodyValue: "secret-body-value",
        secretHeaderValue: "secret-header-value",
      };

      const COLL_PATH = getTestJsonFilePath("secret-envs-coll.json");
      const ENVS_PATH = getTestJsonFilePath("secret-envs.json");
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error, stdout } = await runCLI(args, { env });

      expect(stdout).toContain(
        "https://httpbin.org/basic-auth/*********/*********"
      );
      expect(error).toBeNull();
    });

    // Prefers values specified in the environment export file over values set in the system environment
    test("Supports specifying values for secret environment variables directly in the environment export file and persists the variables set from the pre-request script", async () => {
      const COLL_PATH = getTestJsonFilePath("secret-envs-coll.json");
      const ENVS_PATH = getTestJsonFilePath("secret-supplied-values-envs.json");
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error, stdout } = await runCLI(args);

      expect(stdout).toContain(
        "https://httpbin.org/basic-auth/*********/*********"
      );
      expect(error).toBeNull();
    });

    // Values set from the scripting context takes the highest precedence
    test("Supports setting values for secret environment variables from the pre-request script and overrides values set at the supplied environment export file", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "secret-envs-persistence-coll.json"
      );
      const ENVS_PATH = getTestJsonFilePath("secret-supplied-values-envs.json");
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error, stdout } = await runCLI(args);

      expect(stdout).toContain(
        "https://httpbin.org/basic-auth/*********/*********"
      );
      expect(error).toBeNull();
    });

    test("Persists secret environment variable values set from the pre-request script for consumption in the request and post-request script context", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "secret-envs-persistence-scripting-coll.json"
      );
      const ENVS_PATH = getTestJsonFilePath(
        "secret-envs-persistence-scripting-envs.json"
      );
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });
  });
});

describe("Test 'hopp test <file> --delay <delay_in_ms>' command:", () => {
  const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes.json")}`;

  test("No value passed to delay flag.", async () => {
    const args = `${VALID_TEST_ARGS} --delay`;
    const { stderr } = await runCLI(args);

    const out = getErrorCode(stderr);
    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Invalid value passed to delay flag.", async () => {
    const args = `${VALID_TEST_ARGS} --delay 'NaN'`;
    const { stderr } = await runCLI(args);

    const out = getErrorCode(stderr);
    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Valid value passed to delay flag.", async () => {
    const args = `${VALID_TEST_ARGS} --delay 1`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });
});
