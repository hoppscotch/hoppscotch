import { HoppCLIError } from "../../../types/errors";
import { parseCollectionData } from "../../../utils/mutators";

describe("parseCollectionData", () => {
  test("Reading non-existing file.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/notexist.json")
    ).rejects.toMatchObject(<HoppCLIError>{
      code: "FILE_NOT_FOUND",
    });
  });

  test("Unparseable JSON contents.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/malformed-collection.json")
    ).rejects.toMatchObject(<HoppCLIError>{
      code: "UNKNOWN_ERROR",
    });
  });

  test("Invalid HoppCollection.", () => {
    return expect(
      parseCollectionData(
        "./src/__tests__/samples/malformed-collection2.json"
      )
    ).rejects.toMatchObject(<HoppCLIError>{
      code: "MALFORMED_COLLECTION",
    });
  });

  test("Valid HoppCollection.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/passes.json")
    ).resolves.toBeTruthy();
  });
});
