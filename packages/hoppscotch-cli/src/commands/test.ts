import fs from "fs";
import { isSafeInteger } from "lodash-es";
import Papa from "papaparse";
import path from "path";

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

    let parsedIterationData: Record<string, unknown>[] | null = null;
    let transformedIterationData: IterationDataItem[][] | undefined;

    const collections = await parseCollectionData(pathOrId, options);

    // Handle CSV-based iteration data:
    // - Validates file existence and extension
    // - Parses CSV into structured data
    // - Filters out empty or whitespace-only rows
    // - Ensures at least one valid row is present
    // - Transforms rows into iteration data format for execution
    if (iterationData) {
      // Ensure the iteration data file exists before processing
      if (!fs.existsSync(iterationData)) {
        throw error({ code: "FILE_NOT_FOUND", path: iterationData });
      }

      // Allow only CSV files for iteration data
      if (path.extname(iterationData) !== ".csv") {
        throw error({
          code: "INVALID_DATA_FILE_TYPE",
          data: iterationData,
        });
      }

      // Read CSV content and parse it into objects using header keys
      const csvData = fs.readFileSync(iterationData, "utf8");
      if (!csvData.trim()) {
        throw error({
          code: "INVALID_ITERATION_DATA",
          data: "CSV file is empty",
        });
      }

      const parsed = Papa.parse(csvData, { header: true });
      const criticalErrors = parsed.errors?.filter(
        (e) => e.code !== "TooFewFields"
      );

      if (criticalErrors && criticalErrors.length > 0) {
        throw error({
          code: "INVALID_ITERATION_DATA",
          data: criticalErrors[0]?.message ?? "CSV parsing failed",
        });
      }
      
      // Reject if the CSV file contains no rows
      if (!parsed.data || parsed.data.length === 0) {
        throw error({
          code: "INVALID_ITERATION_DATA",
          data: "CSV file is empty",
        });
      }

      // Remove rows that contain only null, undefined, or whitespace values
      parsedIterationData = (parsed.data as Record<string, unknown>[]).filter(
        (row) =>
          Object.values(row).some(
            (val) =>
              val !== null && val !== undefined && String(val).trim() !== ""
          )
      );

      // Reject if all rows are empty after filtering
      if (parsedIterationData.length === 0) {
        throw error({
          code: "INVALID_ITERATION_DATA",
          data: "CSV contains only empty rows",
        });
      }

      // Transform data into the desired format
      transformedIterationData = parsedIterationData
        .map((item) => {
          const iterationDataItem = item;
          const keys = Object.keys(iterationDataItem);

          return (
            keys
              // Exclude keys with empty or whitespace-only values
              .filter((key) => {
                const val = iterationDataItem[key];
                return (
                  val !== null && val !== undefined && String(val).trim() !== ""
                );
              })
              .map(
                (key) =>
                  <IterationDataItem>{
                    key: key,
                    initialValue: iterationDataItem[key],
                    currentValue: iterationDataItem[key],
                    secret: false,
                  }
              )
          );
        })
        // Ignore items that result in an empty array
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
    const hasSucceeded = collectionsRunnerResult(report, reporterJunit);

    collectionsRunnerExit(hasSucceeded);
  } catch (e) {
    if (isHoppCLIError(e)) {
      handleError(e);
      process.exit(1);
    } else throw e;
  }
};
