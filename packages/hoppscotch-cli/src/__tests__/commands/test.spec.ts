import { ExecException } from "child_process";
import { HoppErrorCode } from "../../types/errors";
import { execAsync, getErrorCode, getTestJsonFilePath } from "../utils";

describe("Test 'hopp test <file>' command:", () => {
  test("No collection file path provided.", async () => {
    const cmd = `node ./bin/hopp test`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Collection file not found.", async () => {
    const cmd = `node ./bin/hopp test notfound.json`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
  });

  test("Malformed collection file.", async () => {
    const cmd = `node ./bin/hopp test ${getTestJsonFilePath(
      "malformed-collection.json"
    )}`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("MALFORMED_COLLECTION");
  });

  test("Invalid arguement.", async () => {
    const cmd = `node ./bin/hopp invalid-arg`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Collection file not JSON type.", async () => {
    const cmd = `node ./bin/hopp test ${getTestJsonFilePath("notjson.txt")}`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
  });

  test("Some errors occured (exit code 1).", async () => {
    const cmd = `node ./bin/hopp test ${getTestJsonFilePath("fails.json")}`;
    const { error } = await execAsync(cmd);

    expect(error).not.toBeNull();
    expect(error).toMatchObject(<ExecException>{
      code: 1,
    });
  });

  test("No errors occured (exit code 0).", async () => {
    const cmd = `node ./bin/hopp test ${getTestJsonFilePath("passes.json")}`;
    const { error } = await execAsync(cmd);

    expect(error).toBeNull();
  });
});

describe("Test 'hopp test <file> --env <file>' command:", () => {
  const VALID_TEST_CMD = `node ./bin/hopp test ${getTestJsonFilePath(
    "passes.json"
  )}`;

  test("No env file path provided.", async () => {
    const cmd = `${VALID_TEST_CMD} --env`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("ENV file not JSON type.", async () => {
    const cmd = `${VALID_TEST_CMD} --env ${getTestJsonFilePath("notjson.txt")}`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_FILE_TYPE");
  });

  test("ENV file not found.", async () => {
    const cmd = `${VALID_TEST_CMD} --env notfound.json`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("FILE_NOT_FOUND");
  });

  test("No errors occured (exit code 0).", async () => {
    const TESTS_PATH = getTestJsonFilePath("env-flag-tests.json");
    const ENV_PATH = getTestJsonFilePath("env-flag-envs.json");
    const cmd = `node ./bin/hopp test ${TESTS_PATH} --env ${ENV_PATH}`;
    const { error } = await execAsync(cmd);

    expect(error).toBeNull();
  });
});

describe("Test 'hopp test <file> --delay <delay_in_ms>' command:", () => {
  const VALID_TEST_CMD = `node ./bin/hopp test ${getTestJsonFilePath(
    "passes.json"
  )}`;

  test("No value passed to delay flag.", async () => {
    const cmd = `${VALID_TEST_CMD} --delay`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Invalid value passed to delay flag.", async () => {
    const cmd = `${VALID_TEST_CMD} --delay 'NaN'`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);

    expect(out).toBe<HoppErrorCode>("INVALID_ARGUMENT");
  });

  test("Valid value passed to delay flag.", async () => {
    const cmd = `${VALID_TEST_CMD} --delay 1`;
    const { error } = await execAsync(cmd);

    expect(error).toBeNull();
  });
});
