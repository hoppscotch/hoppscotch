import fs from "fs";
import { isSafeInteger } from "lodash-es";
import Papa from "papaparse";
import path from "path";

import {
  createJUnitRoot,
  buildJUnitReport,
  generateJUnitReportExport,
  exportJUnitReport,
} from "../utils/reporters/junit"; 

import { handleError } from "../handlers/error";
import { parseDelayOption } from "../options/test/delay";
import { parseEnvsData } from "../options/test/env";
import { IterationDataItem } from "../types/collections";
import { TestCmdEnvironmentOptions, TestCmdOptions } from "../types/commands";
import { error } from "../types/errors";
import { HoppEnvs } from "../types/request";
import { isHoppCLIError } from "../utils/checks";
import {
  collectionsRunner,
  collectionsRunnerExit,
  collectionsRunnerResult,
} from "../utils/collections";
import { parseCollectionData } from "../utils/mutators";

export const test = (pathOrId: string, options: TestCmdOptions) => async () => {
  try {
    const {
      delay,
      env,
      iterationCount,
      iterationData,
      reporterJunit,
      legacySandbox,
    } = options;

    if (
      iterationCount !== undefined &&
      (iterationCount < 1 || !isSafeInteger(iterationCount))
    ) {
      throw error({
        code: "INVALID_ARGUMENT",
        data: "The value must be a positive integer",
      });
    }

    const resolvedDelay = delay ? parseDelayOption(delay) : 0;

    const envs = env
      ? await parseEnvsData(options as TestCmdEnvironmentOptions)
      : <HoppEnvs>{ global: [], selected: [] };

    let parsedIterationData: unknown[] | null = null;
    let transformedIterationData: IterationDataItem[][] | undefined;

    const collections = await parseCollectionData(pathOrId, options);

    if (iterationData) {
      if (!fs.existsSync(iterationData)) {
        throw error({ code: "FILE_NOT_FOUND", path: iterationData });
      }

      if (path.extname(iterationData) !== ".csv") {
        throw error({
          code: "INVALID_DATA_FILE_TYPE",
          data: iterationData,
        });
      }

      const csvData = fs.readFileSync(iterationData, "utf8");
      parsedIterationData = Papa.parse(csvData, { header: true }).data;

      transformedIterationData = parsedIterationData
        .map((item) => {
          const iterationDataItem = item as Record<string, unknown>;
          const keys = Object.keys(iterationDataItem);

          return keys
            .filter((key) => iterationDataItem[key] !== "")
            .map(
              (key) =>
                <IterationDataItem>{
                  key,
                  initialValue: iterationDataItem[key],
                  currentValue: iterationDataItem[key],
                  secret: false,
                }
            );
        })
        .filter((item) => item.length > 0);
    }

    const resolvedLegacySandbox = Boolean(legacySandbox);

    const report = await collectionsRunner({
      collections,
      envs,
      delay: resolvedDelay,
      iterationData: transformedIterationData,
      iterationCount,
      legacySandbox: resolvedLegacySandbox,
    });

// Generate JUnit report if enabled via CLI option.
// Handles multiple report shapes (array / results / requests)
// and aggregates test metrics at request level.

    if (reporterJunit) {
      const xmlRoot = createJUnitRoot();

      let totalTests = 0;
      let totalFailures = 0;
      let totalErrors = 0;
      let totalDuration = 0;

      const exportPath =
        typeof reporterJunit === "string"
          ? reporterJunit
          : "hopp-cli-test/hopp-junit-report.xml";

// Normalize report structure as collectionsRunner may return:
// - array of request reports
// - object with `results`
// - object with `requests`

      const requestReportsRaw =
        Array.isArray((report as any)?.results)
          ? (report as any).results
          : Array.isArray((report as any)?.requests)
          ? (report as any).requests
          : Array.isArray(report)
          ? report
          : [];

      const requestReports = requestReportsRaw
        .map((r: any) => r?.report ?? r)
        .filter((r: any) => r && typeof r === "object");

      requestReports.forEach((reqReport: any) => {
        const { failedRequestTestCases, erroredRequestTestCases } =
          buildJUnitReport(xmlRoot, {
            path: reqReport.path,
            tests: reqReport.tests ?? [],
            errors: reqReport.errors ?? [],
            duration: reqReport.duration?.test ?? 0,
          });

        totalFailures += failedRequestTestCases;
        totalErrors += erroredRequestTestCases;

        (reqReport.tests ?? []).forEach((testSuite: any) => {
          totalTests += testSuite.expectResults?.length || 0;
        });

        totalDuration += reqReport.duration?.test ?? 0;
      });

      generateJUnitReportExport(xmlRoot, {
        totalTestCases: totalTests,
        totalFailedTestCases: totalFailures,
        totalErroredTestCases: totalErrors,
        testDuration: totalDuration,
        reporterJUnitExportPath: exportPath,
      });

      try {

        const dir = path.dirname(exportPath);

// Create directory only for custom export paths.
// Default path is managed by test setup.

if (typeof reporterJunit === "string") {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

    exportJUnitReport(xmlRoot, exportPath);
  } catch (err) {
    throw error({
      code: "REPORT_EXPORT_FAILED",
      data: err instanceof Error ? err.message : null,
      path: exportPath,
    });
  }
}

// Ensure CLI exits reliably after execution.
// collectionsRunnerExit handles standard flow,
// setImmediate acts as a fallback to prevent hanging processes.
const hasSucceeded = collectionsRunnerResult(report, reporterJunit);
collectionsRunnerExit(hasSucceeded);

setImmediate(() => {
  if (!process.exitCode) {
    process.exit(hasSucceeded ? 0 : 1);
  }
});
  } catch (e) {
    if (isHoppCLIError(e)) {
      handleError(e);
      process.exit(1);
    } else {
      throw e;
    }
  }
};