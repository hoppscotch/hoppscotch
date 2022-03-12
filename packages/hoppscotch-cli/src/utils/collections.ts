import chalk from "chalk";
import { mergeWith } from "lodash";
import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import { log } from "console";
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data";
import { handleError } from "../handlers/error";
import { HoppEnvs, CollectionStack } from "../types/request";
import { TestMetrics } from "../types/response";
import { processRequest } from "./request";

/**
 * Processes each requests within collections to prints details of subsequent requests,
 * tests and to generate complete test-metrics
 * @param collections Array of hopp-collection with hopp-requests to be processed.
 * @returns Object describing quantitative details of tests-report such as
 * total passed & failed, test-suites and test-cases.
 */
export const collectionsRunner =
  (collections: HoppCollection<HoppRESTRequest>[]): T.Task<TestMetrics> =>
  async () => {
    // Initial state of hopp-envs.
    const envs: HoppEnvs = { global: [], selected: [] };

    // Initial state of testMeitrcs.
    const overallTestMetrics: TestMetrics = {
      testSuites: { failing: 0, passing: 0 },
      tests: { failing: 0, passing: 0 },
    };

    // Initial state of collection stack.
    const collectionStack: CollectionStack[] = getCollectionStack(collections);

    while (collectionStack.length) {
      // Pop out top-most collection from stack to be processed.
      const { collection, path } = <CollectionStack>collectionStack.pop();

      // Processing each request in collection
      for (const request of collection.requests) {
        const requestPath = `${path}/${
          request.name.length === 0 ? "Untitled Request" : request.name
        }`;

        // Request processing initiated message.
        log(chalk.yellow(`Running request: ${requestPath}`));

        // Processing current request
        const result = await processRequest(request, envs, path)();

        if (E.isLeft(result)) {
          handleError(result.left);
        } else {
          // Updating initiall envs with new envs from result.
          const { global, selected } = result.right.envs;
          envs.global = global;
          envs.selected = selected;

          // Updating testMetrics with new testMetrics from result.
          const newTestMetrics = result.right.testMetrics;
          const { testSuites, tests } = getUpdatedTestMetrics(
            overallTestMetrics,
            newTestMetrics
          );
          overallTestMetrics.testSuites = testSuites;
          overallTestMetrics.tests = tests;
        }
      }

      // Pushing remaining folders realted collection to stack.
      for (const folder of collection.folders) {
        collectionStack.push({
          path: `${path}/${folder.name}`,
          collection: folder,
        });
      }
    }

    return overallTestMetrics;
  };

/**
 * Transforms collections to generate collection-stack which describes each collection's
 * path within collection & collection itself.
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
 * Merges data of current-test-metrics and new-test-metrics (returned from processing-request)
 * to generate updated test-metrics for collections-runner.
 * @param overallTestMetrics Current state of test-metrics in collections-runner.
 * @param newTestMetrics New test-metrics returned from latest processed request.
 * @returns Updated test-metrics object with updated number of test-cases & test-suites.
 */
const getUpdatedTestMetrics = (
  overallTestMetrics: TestMetrics,
  newTestMetrics: TestMetrics
): TestMetrics => {
  const updatedTestMetrics = mergeWith(
    <TestMetrics>{
      testSuites: { failing: 0, passing: 0 },
      tests: { failing: 0, passing: 0 },
    },
    overallTestMetrics,
    newTestMetrics,
    (curr, target) => ({
      failing: curr.failing + target.failing,
      passing: curr.passing + target.passing,
    })
  );

  return updatedTestMetrics;
};

/**
 * Prints collection-runner-report using test-metrics data in table format.
 * @param data Provides metrics realted to tests (such number of failing/passing
 * tests, failing/passing tests-suites).
 */
export const collectionsRunnerResult = (data: TestMetrics) => {
  const { tests, testSuites } = data;

  const testsMessage = `Tests: ${chalk.redBright(
    `${tests.failing} failing`
  )}, ${chalk.greenBright(`${tests.passing} passing`)}\n`;

  const testSuitesMessage = `Test Suites: ${chalk.redBright(
    `${testSuites.failing} failing`
  )}, ${chalk.greenBright(`${testSuites.passing} passing`)}`;

  const message = `${testsMessage}${testSuitesMessage}`;

  log(message);
};
