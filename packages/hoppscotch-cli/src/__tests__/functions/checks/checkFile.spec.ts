import { HoppCLIError } from "../../../types/errors";
import { checkFile } from "../../../utils/checks";

import "@relmify/jest-fp-ts";

describe("checkFile", () => {
  test("File doesn't exists.", () => {
    return expect(
      checkFile("./src/samples/this-file-not-exists.json")()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "FILE_NOT_FOUND",
    });
  });

  test("File not of JSON type.", () => {
    return expect(
      checkFile("./src/__tests__/samples/notjson.txt")()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "INVALID_FILE_TYPE",
    });
  });

  test("Existing JSON file.", () => {
    return expect(
      checkFile("./src/__tests__/samples/passes.json")()
    ).resolves.toBeRight();
  });
});
