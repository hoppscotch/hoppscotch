import { info, log } from "console";
import fs from "fs";
import path from "path";

import { create } from "xmlbuilder2";
import { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import { TestReport } from "../../interfaces/response";
import { error, HoppCLIError } from "../../types/errors";
import { RequestReport } from "../../types/request";
import { exceptionColors } from "../getters";

type BuildJUnitReportArgs = Omit<RequestReport, "result" | "duration"> & {
  duration: RequestReport["duration"]["test"];
};

type BuildJUnitReportResult = {
  failedRequestTestCases: number;
  erroredRequestTestCases: number;
};

type GenerateJUnitReportExportArgs = {
  totalTestCases: number;
  totalFailedTestCases: number;
  totalErroredTestCases: number;
  testDuration: number;
  reporterJUnitExportPath: string;
};

const { INFO, SUCCESS } = exceptionColors;

// Create the root XML element
const rootEl = create({ version: "1.0", encoding: "UTF-8" }).ele("testsuites");

/**
 * Builds a JUnit report based on the provided request report.
 * Creates a test suite at the request level populating the XML document structure.
 *
 * @param {BuildJUnitReportArgs} options - The options to build the JUnit report.
 * @param {string} options.path - The path of the request.
 * @param {TestReport[]} options.tests - The test suites for the request.
 * @param {HoppCLIError[]} options.errors - The errors encountered during the request.
 * @param {number} options.duration - Time taken to execute the test suite.
 * @returns {BuildJUnitReportResult} An object containing the number of failed and errored test cases.
 */
export const buildJUnitReport = ({
  path,
  tests: testSuites,
  errors: requestTestSuiteErrors,
  duration: testSuiteDuration,
}: BuildJUnitReportArgs): BuildJUnitReportResult => {
  let requestTestSuiteError: XMLBuilder | null = null;

  // Create a test suite at the request level
  const requestTestSuite = rootEl.ele("testsuite", {
    name: path,
    time: testSuiteDuration,
    timestamp: new Date().toISOString(),
  });

  if (requestTestSuiteErrors.length > 0) {
    requestTestSuiteError = requestTestSuite.ele("system-err");
  }

  let systemErrContent = "";

  requestTestSuiteErrors.forEach((error) => {
    let compiledError = error.code;

    if ("data" in error) {
      compiledError += ` - ${error.data}`;
    }

    // Append each error message with a newline for separation
    systemErrContent += `\n${" ".repeat(6)}${compiledError}`;
  });

  // There'll be a single `CDATA` element compiling all the error messages
  if (requestTestSuiteError) {
    requestTestSuiteError.dat(systemErrContent);
  }

  let requestTestCases = 0;
  let erroredRequestTestCases = 0;
  let failedRequestTestCases = 0;

  // Test suites correspond to `pw.test()` invocations
  testSuites.forEach(({ descriptor, expectResults }) => {
    requestTestCases += expectResults.length;

    expectResults.forEach(({ status, message }) => {
      const testCase = requestTestSuite
        .ele("testcase", {
          name: `${descriptor} - ${message}`,
        })
        .att("classname", path);

      if (status === "fail") {
        failedRequestTestCases += 1;

        testCase
          .ele("failure")
          .att("type", "AssertionFailure")
          .att("message", message);
      } else if (status === "error") {
        erroredRequestTestCases += 1;

        testCase.ele("error").att("message", message);
      }
    });
  });

  requestTestSuite.att("tests", requestTestCases.toString());
  requestTestSuite.att("failures", failedRequestTestCases.toString());
  requestTestSuite.att("errors", erroredRequestTestCases.toString());

  return {
    failedRequestTestCases,
    erroredRequestTestCases,
  };
};

/**
 * Generates the built JUnit report export at the specified path.
 *
 * @param {GenerateJUnitReportExportArgs} options - The options to generate the JUnit report export.
 * @param {number} options.totalTestCases - The total number of test cases.
 * @param {number} options.totalFailedTestCases - The total number of failed test cases.
 * @param {number} options.totalErroredTestCases - The total number of errored test cases.
 * @param {number} options.testDuration - The total duration of test cases.
 * @param {string} options.reporterJUnitExportPath - The path to export the JUnit report.
 * @returns {void}
 */
export const generateJUnitReportExport = ({
  totalTestCases,
  totalFailedTestCases,
  totalErroredTestCases,
  testDuration,
  reporterJUnitExportPath,
}: GenerateJUnitReportExportArgs) => {
  rootEl
    .att("tests", totalTestCases.toString())
    .att("failures", totalFailedTestCases.toString())
    .att("errors", totalErroredTestCases.toString())
    .att("time", testDuration.toString());

  // Convert the XML structure to a string
  const xmlDocString = rootEl.end({ prettyPrint: true });

  // Write the XML string to the specified path
  try {
    const resolvedExportPath = path.resolve(reporterJUnitExportPath);

    if (fs.existsSync(resolvedExportPath)) {
      info(
        INFO(`\nOverwriting the pre-existing path: ${reporterJUnitExportPath}.`)
      );
    }

    fs.mkdirSync(path.dirname(resolvedExportPath), {
      recursive: true,
    });

    fs.writeFileSync(resolvedExportPath, xmlDocString);

    log(
      SUCCESS(
        `\nSuccessfully exported the JUnit report to: ${reporterJUnitExportPath}.`
      )
    );
  } catch (err) {
    const data = err instanceof Error ? err.message : null;
    throw error({
      code: "REPORT_EXPORT_FAILED",
      data,
      path: reporterJUnitExportPath,
    });
  }
};
