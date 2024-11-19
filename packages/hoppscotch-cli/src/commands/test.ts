import fs from "fs";
import { isSafeInteger } from "lodash-es";
import Papa from "papaparse";
import path from "path";

import { handleError } from "../handlers/error";
import { parseDelayOption } from "../options/test/delay";
import { parseEnvsData } from "../options/test/env";
import { IterationDataEntry } from "../types/collections";
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
    if (
      options.iterations !== undefined &&
      (options.iterations < 1 || !isSafeInteger(options.iterations))
    ) {
      throw error({
        code: "INVALID_ARGUMENT",
        data: "The value must be a positive integer",
      });
    }

    const delay = options.delay ? parseDelayOption(options.delay) : 0;

    const envs = options.env
      ? await parseEnvsData(options as TestCmdEnvironmentOptions)
      : <HoppEnvs>{ global: [], selected: [] };

    const { iterations } = options;

    let data: unknown[];
    let iterationData: IterationDataEntry[][] | undefined;

    const collections = await parseCollectionData(pathOrId, options);

    if (options.data) {
      // Check file existence
      if (!fs.existsSync(options.data)) {
        throw error({ code: "FILE_NOT_FOUND", path: options.data });
      }

      // Check the file extension
      if (path.extname(options.data) !== ".csv") {
        throw error({ code: "INVALID_DATA_FILE_TYPE", data: options.data });
      }

      const csvData = fs.readFileSync(options.data, "utf8");
      data = Papa.parse(csvData, { header: true }).data;

      // Transform data into the desired format
      iterationData = data
        .map((item) =>
          Object.entries(item as IterationDataEntry)
            // Ignore keys with empty string values
            .filter(([value]) => value !== "")
            .map(([key, value]) => ({ key, value, secret: false }))
        )
        // Ignore items that result in an empty array
        .filter((item) => item.length > 0) as IterationDataEntry[][];
    }

    const report = await collectionsRunner({
      collections,
      envs,
      delay,
      iterationData,
      iterations,
    });
    const hasSucceeded = collectionsRunnerResult(report, options.reporterJunit);

    collectionsRunnerExit(hasSucceeded);
  } catch (e) {
    if (isHoppCLIError(e)) {
      handleError(e);
      process.exit(1);
    } else throw e;
  }
};
