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
export const createJUnitRoot = () =>
  create({ version: "1.0", encoding: "UTF-8" }).ele("testsuites");
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
export const buildJUnitReport = (
  xmlRoot: XMLBuilder,   
  {
    path,
    tests,
    errors,
    duration,
  }: BuildJUnitReportArgs
): BuildJUnitReportResult => {
  let requestTestSuiteError: XMLBuilder | null = null;

  // Create a test suite at the request level
  const requestTestSuite = xmlRoot.ele("testsuite", {
    name: path,
    time: duration,
    timestamp: new Date().toISOString(),
  });

  if (errors.length > 0) {
    requestTestSuiteError = requestTestSuite.ele("system-err");
  }

  let systemErrContent = "";

  errors.forEach((error) => {
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
  tests.forEach(({ descriptor, expectResults }) => {
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
export const generateJUnitReportExport = (
  xmlRoot: XMLBuilder, 
  {
    totalTestCases,
    totalFailedTestCases,
    totalErroredTestCases,
    testDuration,
  }: GenerateJUnitReportExportArgs
) => {
  xmlRoot
    .att("tests", totalTestCases.toString())
    .att("failures", totalFailedTestCases.toString())
    .att("errors", totalErroredTestCases.toString())
    .att("time", testDuration.toString());
};

export const exportJUnitReport = (
  xmlRoot: XMLBuilder,
  reporterJUnitExportPath: string
)=> {
  
  // Serialize XML document to string before writing to file

  const xmlDocString = xmlRoot.end({ prettyPrint: true });

  try {
    const exportPath = path.resolve(reporterJUnitExportPath);

    if (fs.existsSync(exportPath)) {
      info(`Overwriting the pre-existing path: ${reporterJUnitExportPath}`);
    }

    if (!reporterJUnitExportPath) {
      throw error({
        code: "REPORT_EXPORT_FAILED",
        data: "Invalid export path",
        path: reporterJUnitExportPath,
      });
    }

    if (!fs.existsSync(path.dirname(exportPath))) {
      fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    }

    fs.writeFileSync(exportPath, xmlDocString, { encoding: "utf8" });

    fs.closeSync(fs.openSync(exportPath, "r"));

    log(
      SUCCESS(
        SUCCESS(
          `\nSuccessfully exported the JUnit report to: ${reporterJUnitExportPath}.`
        )
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