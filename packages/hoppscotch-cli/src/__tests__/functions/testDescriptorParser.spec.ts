import { TestDescriptor } from "@hoppscotch/js-sandbox";
import { testDescriptorParser, getTestMetrics } from "../../utils/test";
import { TestReport } from "../../interfaces/response";

import "@relmify/jest-fp-ts";

const SAMPLE_TEST_DESCRIPTOR: TestDescriptor = {
  descriptor: "Status code is 200",
  expectResults: [
    {
      status: "error",
      message: "some_message",
    },
  ],
  children: [
    {
      descriptor: "Check JSON response property",
      expectResults: [
        {
          status: "pass",
          message: "some_message",
        },
      ],
      children: [],
    },
    {
      descriptor: "Check header property",
      expectResults: [
        {
          status: "fail",
          message: "some_message",
        },
      ],
      children: [],
    },
  ],
};

describe("testDescriptorParser", () => {
  let TEST_REPORT: TestReport[];
  beforeAll(async () => {
    TEST_REPORT = await testDescriptorParser(SAMPLE_TEST_DESCRIPTOR)();
  });

  it("Should have 3 tests-report.", () => {
    expect(TEST_REPORT).toEqual(expect.any(Array));
    expect(TEST_REPORT.length).toStrictEqual(3);
  });

  it("Should have 1 passed, 2 failed test-cases; 1 passed, 2 failed test-suite.", () => {
    const testMetrics = getTestMetrics(TEST_REPORT, 1, []);
    const { testSuites, tests } = testMetrics;

    expect(tests.failed).toStrictEqual(2);
    expect(tests.passed).toStrictEqual(1);
    expect(testSuites.failed).toStrictEqual(2);
    expect(testSuites.passed).toStrictEqual(1);
  });
});
