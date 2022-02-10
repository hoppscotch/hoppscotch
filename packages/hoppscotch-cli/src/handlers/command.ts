import fs from "fs/promises";
import inquirer from "inquirer";
import chalk from "chalk";
import * as A from "fp-ts/Array";
import * as S from "fp-ts/string";
import { pipe } from "fp-ts/function";
import { createStream, getBorderCharacters } from "table";
import fuzzyPath from "inquirer-fuzzy-path";
inquirer.registerPrompt("fuzzypath", fuzzyPath);

import { CLIContext, TestScriptPair } from "../interfaces";
import {
  errors,
  isRESTCollection,
  requestsParser,
  checkFileURL,
  parseOptions,
  pingConnection,
  testParser,
} from "../utils";

/**
 * Command handler for:
 * hopp-cli test
 * hopp-cli run <path to collection file>`
 * @param context The initial CLI context object
 */
export const collectionRunner = async (
  context: CLIContext,
  debug: boolean = false
) => {
  if (debug === true) {
    const checkDebugger = await pingConnection("localhost", 9999);
    if (!checkDebugger) {
      throw errors.HOPP002;
    }
  }

  if (context.interactive) {
    await parseOptions(context);
  } else if (S.isString(context.path)) {
    context.path = await checkFileURL(context.path!);
  } else {
    throw errors.HOPP005;
  }
  const collectionArray = JSON.parse(
    (await fs.readFile(context.path!)).toString()
  );
  const valid = [];
  for (const [idx, _] of collectionArray.entries()) {
    const pm = {
      x: { ...collectionArray[idx] },
    };
    valid.push(isRESTCollection(pm));
    collectionArray[idx] = pm.x;
  }
  if (valid.every((val) => val)) {
    context.collections = collectionArray;
    console.clear();
    console.log(
      pipe("Collection JSON parsed! Executing requests...", chalk.yellowBright)
    );
    const tableStream = createStream({
      columnDefault: {
        width: 30,
        alignment: "center",
        verticalAlignment: "middle",
        wrapWord: true,
      },
      columnCount: 4,
      border: getBorderCharacters("ramac"),
    });
    tableStream.write([
      pipe("PATH", chalk.cyanBright, chalk.bold),
      pipe("METHOD", chalk.cyanBright, chalk.bold),
      pipe("ENDPOINT", chalk.cyanBright, chalk.bold),
      pipe("STATUS CODE", chalk.cyanBright, chalk.bold),
    ]);
    const responses: TestScriptPair[] = [];
    for (const x of collectionArray) {
      await requestsParser(x, tableStream, responses, debug);
    }
    process.stdout.write("\n");

    if (A.isNonEmpty(responses)) {
      let exitCode: number = 0,
        totalFailing: number = 0;

      for (const test of responses) {
        const testScript = pipe(test.testScript, S.trim);
        if (!S.isEmpty(testScript)) {
          console.log(
            pipe(
              `\nRunning tests for ${chalk.bold(test.name)}...`,
              chalk.yellowBright
            )
          );
          totalFailing += await testParser(test);
        }
      }

      exitCode = totalFailing > 0 ? 1 : 0;
      process.exit(exitCode);
    }
  } else {
    throw errors.HOPP003;
  }
};
