import { Environment } from "@hoppscotch/data";
import { getEffectiveFinalMetaData } from "../../../utils/getters";

const DEFAULT_ENV = <Environment>{
  name: "name",
  variables: [{ key: "PARAM", value: "parsed_param" }],
};

describe("getEffectiveFinalMetaData", () => {
  test("Empty list of meta-data.", () => {
    expect(getEffectiveFinalMetaData([], DEFAULT_ENV)).toSubsetEqualRight([]);
  });

  test("Non-empty active list of meta-data with unavailable ENV.", () => {
    expect(
      getEffectiveFinalMetaData(
        [{ active: true, key: "<<UNKNOWN_KEY>>", value: "<<UNKNOWN_VALUE>>" }],
        DEFAULT_ENV
      )
    ).toSubsetEqualRight([{ active: true, key: "", value: "" }]);
  });

  test("Inactive list of meta-data.", () => {
    expect(
      getEffectiveFinalMetaData(
        [{ active: false, key: "KEY", value: "<<PARAM>>" }],
        DEFAULT_ENV
      )
    ).toSubsetEqualRight([]);
  });

  test("Active list of meta-data.", () => {
    expect(
      getEffectiveFinalMetaData(
        [{ active: true, key: "PARAM", value: "<<PARAM>>" }],
        DEFAULT_ENV
      )
    ).toSubsetEqualRight([
      { active: true, key: "PARAM", value: "parsed_param" },
    ]);
  });
});
