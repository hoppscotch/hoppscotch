import { info, log } from "console";
import fs from "fs";
import path from "path";

import { RequestReport } from "../../types/request";
import { error } from "../../types/errors";
import { exceptionColors } from "../getters";

const { INFO, SUCCESS } = exceptionColors;

/**
 * A single request entry in a JSON report iteration.
 */
export type JSONReportRequest = {
  path: string;
  result: boolean;
  duration: {
    test: number;
    request: number;
    preRequest: number;
  };
  tests: {
    passed: number;
    failed: number;
  };
  errors: { code: string; data?: unknown }[];
};

/**
 * A single iteration in a JSON report.
 */
export type JSONReportIteration = {
  iteration: number;
  requests: JSONReportRequest[];
  passed: number;
  failed: number;
  errored: number;
  duration: number;
};

/**
 * The complete JSON report structure, exported by the `--reporter-json` flag.
 */
export type JSONReport = {
  iterations: JSONReportIteration[];
  summary: {
    iterations: number;
    totalRequests: number;
    passed: number;
    failed: number;
    errored: number;
    duration: number;
  };
};

/**
 * Builds the JSON report iteration for a given set of request reports.
 * Each iteration records per-request details (path, result, durations,
 * test outcomes and errors) plus iteration-level aggregates.
 *
 * @param {number} iteration - The 1-based iteration number.
 * @param {RequestReport[]} requestReports - The request reports of this iteration.
 * @returns {JSONReportIteration} The built iteration.
 */
export const buildJSONReportIteration = (
  iteration: number,
  requestReports: RequestReport[]
): JSONReportIteration => {
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let duration = 0;

  const requests: JSONReportRequest[] = requestReports.map((requestReport) => {
    const {
      path,
      tests,
      errors,
      result,
      duration: requestDurations,
    } = requestReport;

    if (errors.length > 0) {
      errored += 1;
    } else if (result) {
      passed += 1;
    } else {
      failed += 1;
    }

    duration += requestDurations.request;

    return {
      path,
      result,
      duration: requestDurations,
      tests: {
        passed: tests.reduce(
          (acc, suite) =>
            acc + suite.expectResults.filter((t) => t.status === "pass").length,
          0
        ),
        failed: tests.reduce(
          (acc, suite) =>
            acc + suite.expectResults.filter((t) => t.status === "fail").length,
          0
        ),
      },
      errors: errors.map((err) => ({
        code: err.code,
        ...("data" in err ? { data: err.data } : {}),
      })),
    };
  });

  return {
    iteration,
    requests,
    passed,
    failed,
    errored,
    duration,
  };
};

/**
 * Generates the built JSON report export at the specified path.
 *
 * @param {JSONReport} report - The report to export.
 * @param {string} reporterJSONExportPath - The path to export the JSON report.
 * @returns {void}
 */
export const generateJSONReportExport = (
  report: JSONReport,
  reporterJSONExportPath: string
) => {
  // Convert the report to a pretty-printed JSON string
  const jsonDocString = JSON.stringify(report, null, 2);

  try {
    const resolvedExportPath = path.resolve(reporterJSONExportPath);

    if (fs.existsSync(resolvedExportPath)) {
      info(
        INFO(`\nOverwriting the pre-existing path: ${reporterJSONExportPath}.`)
      );
    }

    fs.mkdirSync(path.dirname(resolvedExportPath), {
      recursive: true,
    });

    fs.writeFileSync(resolvedExportPath, jsonDocString);

    log(
      SUCCESS(
        `\nSuccessfully exported the JSON report to: ${reporterJSONExportPath}.`
      )
    );
  } catch (err) {
    const data = err instanceof Error ? err.message : null;
    throw error({
      code: "REPORT_EXPORT_FAILED",
      data,
      path: reporterJSONExportPath,
    });
  }
};
