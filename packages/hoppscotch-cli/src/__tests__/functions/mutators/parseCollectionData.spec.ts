import { describe, expect, test } from "vitest";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { HoppCLIError } from "../../../types/errors";
import { parseCollectionData } from "../../../utils/mutators";
import { getTestJsonFilePath } from "../../utils";

describe("parseCollectionData", () => {
  test("Reading non-existing file.", () => {
    return expect(
      parseCollectionData(
        getTestJsonFilePath("notexist.json", "collection"),
        {}
      )
    ).rejects.toMatchObject(<HoppCLIError>{
      code: "FILE_NOT_FOUND",
    });
  });

  test("Unparseable JSON contents.", () => {
    const file = join(
      mkdtempSync(join(tmpdir(), "hopp-cli-test-")),
      "invalid.json"
    );
    writeFileSync(file, "{ invalid json");

    return expect(parseCollectionData(file, {})).rejects.toMatchObject(<
      HoppCLIError
    >{
      code: "UNKNOWN_ERROR",
    });
  });

  test("Invalid HoppCollection.", () => {
    return expect(
      parseCollectionData(
        getTestJsonFilePath("malformed-coll-2.json", "collection"),
        {}
      )
    ).rejects.toMatchObject(<HoppCLIError>{
      code: "MALFORMED_COLLECTION",
    });
  });

  test("Valid HoppCollection.", () => {
    return expect(
      parseCollectionData(
        getTestJsonFilePath("passes-coll.json", "collection"),
        {}
      )
    ).resolves.toBeTruthy();
  });
});
