import {handleError} from "../handlers/error";
import {parseDelayOption} from "../options/test/delay";
import {parseEnvsData} from "../options/test/env";
import {TestCmdEnvironmentOptions, TestCmdOptions} from "../types/commands";
import {HoppEnvs} from "../types/request";
import {isHoppCLIError} from "../utils/checks";
import {
  collectionsRunner,
  collectionsRunnerExit,
  collectionsRunnerResult,
} from "../utils/collections";
import {parseCollectionData} from "../utils/mutators";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import {error} from "../types/errors";

export const test = (pathOrId: string, options: TestCmdOptions) => async () => {
  try {
    const delay = options.delay ? parseDelayOption(options.delay) : 0;

    const envs = options.env
      ? await parseEnvsData(options as TestCmdEnvironmentOptions)
      : <HoppEnvs>{global: [], selected: []};

    const collections = await parseCollectionData(pathOrId, options);
    const iterations = options.iterations || 1;

    let data;
    let transformedData;
    if (options.data) {
      // Check file existence
      if (!fs.existsSync(options.data)) {
        throw error({code: "FILE_NOT_FOUND", path: options.data});
      }
      // Check the file extension
      if (path.extname(options.data) !== '.csv') {
        throw error({code: "INVALID_DATA_FILE_TYPE", data: options.data});
      }
      const csvData = fs.readFileSync(options.data, 'utf8');
      data = Papa.parse(csvData, {header: true}).data;

      // Transform data into the desired format
      transformedData = data.map(item => {
        const keys = Object.keys(item as object);
        return keys
          .filter(key => (item as { [key: string]: any })[key] !== '') // Ignore keys with empty string values
          .map(key => ({
            "key": key,
            "value": (item as { [key: string]: any })[key],
            "secret": false
          }));
      }).filter(item => item.length > 0); // Ignore items that result in an empty array
    }

    const report = await collectionsRunner({collections, envs, delay, transformedData, iterations});
    const hasSucceeded = collectionsRunnerResult(report, options.reporterJunit);

    collectionsRunnerExit(hasSucceeded);
  } catch (e) {
    if (isHoppCLIError(e)) {
      handleError(e);
      process.exit(1);
    } else throw e;
  }
};
