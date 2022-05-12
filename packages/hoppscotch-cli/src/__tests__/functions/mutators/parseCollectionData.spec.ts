import { HoppCLIError } from "../../../types/errors";
import { parseCollectionData } from "../../../utils/mutators";

describe("parseCollectionData", () => {
  test("Reading non-existing file.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/notexist.txt")()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "UNKNOWN_ERROR",
    });
  });

  test("Unparseable JSON contents.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/malformed-collection.json")()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "MALFORMED_COLLECTION",
    });
  });

  test("Invalid HoppCollection.", () => {
    return expect(
      parseCollectionData(
        "./src/__tests__/samples/malformed-collection2.json"
      )()
    ).resolves.toSubsetEqualLeft(<HoppCLIError>{
      code: "MALFORMED_COLLECTION",
    });
  });

  test("Valid HoppCollection.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/passes.json")()
    ).resolves.toBeRight();
  });
});
