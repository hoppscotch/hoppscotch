import { HoppCLIError } from "../../../types/errors";
import { checkFilePath } from "../../../utils/checks";

describe("checkFilePath", () => {
  test("File doesn't exists.", () => {
    return expect(
      checkFilePath("./src/samples/this-file-not-exists.json")()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "FILE_NOT_FOUND",
    });
  });

  test("File not of JSON type.", () => {
    return expect(
      checkFilePath("./src/__tests__/samples/notjson.txt")()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "FILE_NOT_JSON",
    });
  });

  test("Existing JSON file.", () => {
    return expect(
      checkFilePath("./src/__tests__/samples/passes.json")()
    ).resolves.toBeRight();
  });
});
