import { ExecException } from "child_process";

import { HoppErrorCode } from "../../types/errors";
import { runCLI, getErrorCode, getTestJsonFilePath } from "../utils";

describe("Test `hopp test <file>` command:", () => {
  describe("Argument parsing", () => {
    test("Errors with the code `INVALID_ARGUMENT` for not supplying enough arguments", async () => {
      const args = "test";
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Errors with the code `INVALID_ARGUMENT` for an invalid command", async () => {
      const args = "invalid-arg";
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });
  });

  describe("Supplied collection export file validations", () => {
    test("Errors with the code `FILE_NOT_FOUND` if the supplied collection export file doesn't exist", async () => {
      const args = "test notfound.json";
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
    });

    test("Errors with the code UNKNOWN_ERROR if the supplied collection export file content isn't valid JSON", async () => {
      const args = `test ${getTestJsonFilePath("malformed-coll.json", "collection")}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("UNKNOWN_ERROR");
    });

    test("Errors with the code `MALFORMED_COLLECTION` if the supplied collection export file content is malformed", async () => {
      const args = `test ${getTestJsonFilePath("malformed-coll-2.json", "collection")}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("MALFORMED_COLLECTION");
    });

    test("Errors with the code `INVALID_FILE_TYPE` if the supplied collection export file doesn't end with the `.json` extension", async () => {
      const args = `test ${getTestJsonFilePath("notjson-coll.txt", "collection")}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
    });

    test("Fails if the collection file includes scripts with incorrect API usage and failed assertions", async () => {
      const args = `test ${getTestJsonFilePath("fails-coll.json", "collection")}`;
      const { error } = await runCLI(args);

      expect(error).not.toBeNull();
      expect(error).toMatchObject(<ExecException>{
        code: 1,
      });
    });
  });

  describe("Versioned entities", () => {
    describe("Collections & Requests", () => {
      const testFixtures = [
        { fileName: "coll-v1-req-v0.json", collVersion: 1, reqVersion: 0 },
        { fileName: "coll-v1-req-v1.json", collVersion: 1, reqVersion: 1 },
        { fileName: "coll-v2-req-v2.json", collVersion: 2, reqVersion: 2 },
        { fileName: "coll-v2-req-v3.json", collVersion: 2, reqVersion: 3 },
      ];

      testFixtures.forEach(({ collVersion, fileName, reqVersion }) => {
        test(`Successfully processes a supplied collection export file where the collection is based on the "v${collVersion}" schema and the request following the "v${reqVersion}" schema`, async () => {
          const args = `test ${getTestJsonFilePath(fileName, "collection")}`;
          const { error } = await runCLI(args);

          expect(error).toBeNull();
        });
      });
    });

    describe("Environments", () => {
      const testFixtures = [
        { fileName: "env-v0.json", version: 0 },
        { fileName: "env-v1.json", version: 1 },
      ];

      testFixtures.forEach(({ fileName, version }) => {
        test(`Successfully processes the supplied collection and environment export files where the environment is based on the "v${version}" schema`, async () => {
          const ENV_PATH = getTestJsonFilePath(fileName, "environment");
          const args = `test ${getTestJsonFilePath("sample-coll.json", "collection")} --env ${ENV_PATH}`;
          const { error } = await runCLI(args);

          expect(error).toBeNull();
        });
      });
    });
  });

  test("Successfully processes a supplied collection export file of the expected format", async () => {
    const args = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });

  test("Successfully inherits headers and authorization set at the root collection", async () => {
    const args = `test ${getTestJsonFilePath(
      "collection-level-headers-auth-coll.json",
      "collection"
    )}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });

  test("Persists environment variables set in the pre-request script for consumption in the test script", async () => {
    const args = `test ${getTestJsonFilePath(
      "pre-req-script-env-var-persistence-coll.json",
      "collection"
    )}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });
});

describe("Test `hopp test <file> --env <file>` command:", () => {
  describe("Supplied environment export file validations", () => {
    const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;

    test("Errors with the code `INVALID_ARGUMENT` if no file is supplied", async () => {
      const args = `${VALID_TEST_ARGS} --env`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
    });

    test("Errors with the code `INVALID_FILE_TYPE` if the supplied environment export file doesn't end with the `.json` extension", async () => {
      const args = `${VALID_TEST_ARGS} --env ${getTestJsonFilePath(
        "notjson-coll.txt",
        "collection"
      )}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
    });

    test("Errors with the code `FILE_NOT_FOUND` if the supplied environment export file doesn't exist", async () => {
      const args = `${VALID_TEST_ARGS} --env notfound.json`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
    });

    test("Errors with the code `MALFORMED_ENV_FILE` on supplying a malformed environment export file", async () => {
      const ENV_PATH = getTestJsonFilePath(
        "malformed-envs.json",
        "environment"
      );
      const args = `${VALID_TEST_ARGS} --env ${ENV_PATH}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("MALFORMED_ENV_FILE");
    });

    test("Errors with the code `BULK_ENV_FILE` on supplying an environment export file based on the bulk environment export format", async () => {
      const ENV_PATH = getTestJsonFilePath("bulk-envs.json", "environment");
      const args = `${VALID_TEST_ARGS} --env ${ENV_PATH}`;
      const { stderr } = await runCLI(args);

      const out = getErrorCode(stderr);
      expect(out).toBe<HoppErrorCode>("BULK_ENV_FILE");
    });
  });

  test("Successfully resolves values from the supplied environment export file", async () => {
    const TESTS_PATH = getTestJsonFilePath(
      "env-flag-tests-coll.json",
      "collection"
    );
    const ENV_PATH = getTestJsonFilePath("env-flag-envs.json", "environment");
    const args = `test ${TESTS_PATH} --env ${ENV_PATH}`;

    const { error } = await runCLI(args);
    expect(error).toBeNull();
  });

  test("Successfully resolves environment variables referenced in the request body", async () => {
    const COLL_PATH = getTestJsonFilePath(
      "req-body-env-vars-coll.json",
      "collection"
    );
    const ENVS_PATH = getTestJsonFilePath(
      "req-body-env-vars-envs.json",
      "environment"
    );
    const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

    const { error } = await runCLI(args);
    expect(error).toBeNull();
  });

  test("Works with shorth `-e` flag", async () => {
    const TESTS_PATH = getTestJsonFilePath(
      "env-flag-tests-coll.json",
      "collection"
    );
    const ENV_PATH = getTestJsonFilePath("env-flag-envs.json", "environment");
    const args = `test ${TESTS_PATH} -e ${ENV_PATH}`;

    const { error } = await runCLI(args);
    expect(error).toBeNull();
  });

  describe("Secret environment variables", () => {
    jest.setTimeout(100000);

    // Reads secret environment values from system environment
    test("Successfully picks the values for secret environment variables from `process.env` and persists the variables set from the pre-request script", async () => {
      const env = {
        ...process.env,
        secretBearerToken: "test-token",
        secretBasicAuthUsername: "test-user",
        secretBasicAuthPassword: "test-pass",
        secretQueryParamValue: "secret-query-param-value",
        secretBodyValue: "secret-body-value",
        secretHeaderValue: "secret-header-value",
      };

      const COLL_PATH = getTestJsonFilePath(
        "secret-envs-coll.json",
        "collection"
      );
      const ENVS_PATH = getTestJsonFilePath("secret-envs.json", "environment");
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error, stdout } = await runCLI(args, { env });

      expect(stdout).toContain(
        "https://httpbin.org/basic-auth/*********/*********"
      );
      expect(error).toBeNull();
    });

    // Prefers values specified in the environment export file over values set in the system environment
    test("Successfully picks the values for secret environment variables set directly in the environment export file and persists the environment variables set from the pre-request script", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "secret-envs-coll.json",
        "collection"
      );
      const ENVS_PATH = getTestJsonFilePath(
        "secret-supplied-values-envs.json",
        "environment"
      );
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error, stdout } = await runCLI(args);

      expect(stdout).toContain(
        "https://httpbin.org/basic-auth/*********/*********"
      );
      expect(error).toBeNull();
    });

    // Values set from the scripting context takes the highest precedence
    test("Setting values for secret environment variables from the pre-request script overrides values set at the supplied environment export file", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "secret-envs-persistence-coll.json",
        "collection"
      );
      const ENVS_PATH = getTestJsonFilePath(
        "secret-supplied-values-envs.json",
        "environment"
      );
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error, stdout } = await runCLI(args);

      expect(stdout).toContain(
        "https://httpbin.org/basic-auth/*********/*********"
      );
      expect(error).toBeNull();
    });

    test("Persists secret environment variable values set from the pre-request script for consumption in the request and post-request script context", async () => {
      const COLL_PATH = getTestJsonFilePath(
        "secret-envs-persistence-scripting-coll.json",
        "collection"
      );
      const ENVS_PATH = getTestJsonFilePath(
        "secret-envs-persistence-scripting-envs.json",
        "environment"
      );
      const args = `test ${COLL_PATH} --env ${ENVS_PATH}`;

      const { error } = await runCLI(args);
      expect(error).toBeNull();
    });
  });
});

describe("Test `hopp test <file> --delay <delay_in_ms>` command:", () => {
  const VALID_TEST_ARGS = `test ${getTestJsonFilePath("passes-coll.json", "collection")}`;

  test("Errors with the code `INVALID_ARGUMENT` on not supplying a delay value", async () => {
    const args = `${VALID_TEST_ARGS} --delay`;
    const { stderr } = await runCLI(args);

    const out = getErrorCode(stderr);
    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Errors with the code `INVALID_ARGUMENT` on supplying an invalid delay value", async () => {
    const args = `${VALID_TEST_ARGS} --delay 'NaN'`;
    const { stderr } = await runCLI(args);

    const out = getErrorCode(stderr);
    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Successfully performs delayed request execution for a valid delay value", async () => {
    const args = `${VALID_TEST_ARGS} --delay 1`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });

  test("Works with the short `-d` flag", async () => {
    const args = `${VALID_TEST_ARGS} -d 1`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });
});
