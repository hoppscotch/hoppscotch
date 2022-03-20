import * as T from "fp-ts/Task";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import { bold } from "chalk";
import { log } from "console";
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { HoppEnvs, CollectionStack, RequestReport } from "../types/request";
import { preProcessRequest, processRequest } from "./request";
import { exceptionColors } from "./getters";
import { TestReport } from "../interfaces/response";
import {
  printErrorsReport,
  printFailedTestsReport,
  printTestsMetrics,
} from "./display";
const { WARN, FAIL } = exceptionColors;

/**
 * Processes each requests within collections to prints details of subsequent requests,
 * tests and to display complete errors-report, failed-tests-report and test-metrics.
 * @param collections Array of hopp-collection with hopp-requests to be processed.
 * @returns List of report for each processed request.
 */
export const collectionsRunner =
  (collections: HoppCollection<HoppRESTRequest>[]): T.Task<RequestReport[]> =>
  async () => {
    const envs: HoppEnvs = { global: [], selected: [] };
    const requestsReport: RequestReport[] = [];
    const collectionStack: CollectionStack[] = getCollectionStack(collections);

    while (collectionStack.length) {
      // Pop out top-most collection from stack to be processed.
      const { collection, path } = <CollectionStack>collectionStack.pop();

      // Processing each request in collection
      for (const request of collection.requests) {
        const _request = preProcessRequest(request);
        const requestPath = `${path}/${_request.name}`;

        // Request processing initiated message.
        log(WARN(`\nRunning: ${bold(requestPath)}`));

        // Processing current request.
        const result = await processRequest(_request, envs, requestPath)();

        // Updating global & selected envs with new envs from processed-request output.
        const { global, selected } = result.envs;
        envs.global = global;
        envs.selected = selected;

        // Storing current request's report.
        const requestReport = result.report;
        requestsReport.push(requestReport);
      }

      // Pushing remaining folders realted collection to stack.
      for (const folder of collection.folders) {
        collectionStack.push({
          path: `${path}/${folder.name}`,
          collection: folder,
        });
      }
    }

    return requestsReport;
  };

/**
 * Transforms collections to generate collection-stack which describes each collection's
 * path within collection & the collection itself.
 * @param collections Hopp-collection objects to be mapped to collection-stack type.
 * @returns Mapped collections to collection-stack.
 */
const getCollectionStack = (
  collections: HoppCollection<HoppRESTRequest>[]
): CollectionStack[] =>
  pipe(
    collections,
    A.map(
      (collection) => <CollectionStack>{ collection, path: collection.name }
    )
  );

/**
 * Prints collection-runner-report using test-metrics data in table format.
 * @param requestsReport Provides data for each request-report which includes
 * failed-tests-report, errors
 * @returns True, if collection runner executed without any errors or failed test-cases.
 * False, if errors occured or test-cases failed.
 */
export const collectionsRunnerResult = (
  requestsReport: RequestReport[]
): boolean => {
  const testsReport: TestReport[] = [];
  let finalResult = true;

  // Printing requests-report details of failed-tests and errors
  for (const requestReport of requestsReport) {
    const { path, tests, errors, result } = requestReport;

    finalResult = finalResult && result;

    printFailedTestsReport(path, tests);

    printErrorsReport(path, errors);

    testsReport.push.apply(testsReport, tests);
  }

  printTestsMetrics(testsReport);

  return finalResult;
};

/**
 * Exiting hopp cli process with appropriate exit code depending on
 * collections-runner result.
 * If result is true, we exit the cli process with code 0.
 * Else, exit with code 1.
 * @param result Boolean defining the collections-runner result.
 */
export const collectionsRunnerExit = (result: boolean) => {
  if (!result) {
    const EXIT_MSG = FAIL(`\nExited with code 1`);
    process.stdout.write(EXIT_MSG);
    process.exit(1);
  }
  process.exit(0);
};
