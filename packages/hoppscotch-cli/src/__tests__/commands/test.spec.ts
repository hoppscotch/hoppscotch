import { ExecException } from "child_process";

import { HoppErrorCode } from "../../types/errors";
import { runCLI, getErrorCode, getTestJsonFilePath } from "../utils";

describe("Test 'hopp test <file>' command:", () => {
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
    const args = `test ${getTestJsonFilePath(
      "malformed-collection.json"
    )}`;
    const { stderr } = await runCLI(args);

    const out = getErrorCode(stderr);
    expect(out).toBe<HoppErrorCode>("UNKNOWN_ERROR");
  });

  test("Malformed collection file.", async () => {
    const args = `test ${getTestJsonFilePath(
      "malformed-collection2.json"
    )}`;
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

  test("Some errors occured (exit code 1).", async () => {
    const args = `test ${getTestJsonFilePath("fails.json")}`;
    const { error } = await runCLI(args);

    expect(error).not.toBeNull();
    expect(error).toMatchObject(<ExecException>{
      code: 1,
    });
  });

  test("No errors occured (exit code 0).", async () => {
    const args = `test ${getTestJsonFilePath("passes.json")}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  });

  test("Supports inheriting headers and authorization set at the root collection", async () => {
    const args = `test ${getTestJsonFilePath("collection-level-headers-auth.json")}`;
    const { error } = await runCLI(args);

    expect(error).toBeNull();
  })
});

describe("Test 'hopp test <file> --env <file>' command:", () => {
  const VALID_TEST_ARGS = `test ${getTestJsonFilePath(
    "passes.json"
  )}`;

  test("No env file path provided.", async () => {
    const args = `${VALID_TEST_ARGS} --env`;
    const { stderr } = await runCLI(args);

    const out = getErrorCode(stderr);
    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("ENV file not JSON type.", async () => {
    const args = `${VALID_TEST_ARGS} --env ${getTestJsonFilePath("notjson.txt")}`;
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

  test("No errors occured (exit code 0).", async () => {
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
});

describe("Test 'hopp test <file> --delay <delay_in_ms>' command:", () => {
  const VALID_TEST_ARGS = `test ${getTestJsonFilePath(
    "passes.json"
  )}`;

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
