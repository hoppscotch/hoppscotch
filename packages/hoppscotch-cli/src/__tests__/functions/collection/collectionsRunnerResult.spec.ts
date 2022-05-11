import { collectionsRunnerResult } from "../../../utils/collections";

const FALSE_RESULT_REPORT = {
  path: "some_path",
  tests: [],
  errors: [],
  result: false,
  duration: { test: 1, request: 1, preRequest: 1 },
};

const TRUE_RESULT_REPORT = {
  path: "some_path",
  tests: [],
  errors: [],
  result: true,
  duration: { test: 1, request: 1, preRequest: 1 },
};

describe("collectionsRunnerResult", () => {
  test("Empty request-report.", () => {
    expect(collectionsRunnerResult([])).toBeTruthy();
  });

  test("Atleast 1 false result in request-report.", () => {
    expect(
      collectionsRunnerResult([FALSE_RESULT_REPORT, TRUE_RESULT_REPORT])
    ).toBeFalsy();
  });

  test("All true result(s) in request-report.", () => {
    expect(
      collectionsRunnerResult([TRUE_RESULT_REPORT, TRUE_RESULT_REPORT])
    ).toBeTruthy();
  });
});
