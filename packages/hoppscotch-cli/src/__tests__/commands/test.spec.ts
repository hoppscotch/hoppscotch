import { HoppErrorCode } from "../../types/errors";
import { execAsync, getErrorCode, getTestJsonFilePath } from "../utils";

describe("Test 'hopp test <file>' command:", () => {
  test.concurrent("No collection file path provided.", async () => {
    const cmd = `pnpx hopp test`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);
    const code: HoppErrorCode = "NO_FILE_PATH";

    expect(out).toBe(code);
  });

  test.concurrent("Collection file not found.", async () => {
    const cmd = `pnpx hopp test notfound.json`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);
    const code: HoppErrorCode = "FILE_NOT_FOUND";

    expect(out).toBe(code);
  });

  test.concurrent("Malformed collection file.", async () => {
    const cmd = `pnpx hopp test ${getTestJsonFilePath(
      "malformed-collection.json"
    )}`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);
    const code: HoppErrorCode = "MALFORMED_COLLECTION";

    expect(out).toBe(code);
  });

  test.concurrent("Collection file not JSON type.", async () => {
    const cmd = `pnpx hopp test ${getTestJsonFilePath("notjson.txt")}`;
    const { stdout } = await execAsync(cmd);
    const out = getErrorCode(stdout);
    const code: HoppErrorCode = "FILE_NOT_JSON";

    expect(out).toBe(code);
  });

  test.concurrent("Some errors occured (exit code 1).", async () => {
    const cmd = `pnpx hopp test ${getTestJsonFilePath("fails.json")}`;
    const { error } = await execAsync(cmd);

    if (error) {
      expect(error.code).toBe(1);
    } else {
      expect(error).not.toBeNull();
    }
  });

  test.concurrent(
    "No errors occured (exit code 0).",
    async () => {
      const cmd = `pnpx hopp test ${getTestJsonFilePath("passes.json")}`;
      const { error } = await execAsync(cmd);

      if (error) {
        expect(error.code).toBe(0);
      } else {
        expect(error).toBeNull();
      }
    },
    10000
  );
});
