import fs from "fs/promises";
import inquirer from "inquirer";
import chalk from "chalk";
import { createStream } from "table";
import fuzzyPath from "inquirer-fuzzy-path";
inquirer.registerPrompt("fuzzypath", fuzzyPath);

import { CLIContext } from "../interfaces";
import {
  errors,
  isRESTCollection,
  requestParser,
  checkFileURL,
  parseOptions,
  pingConnection,
} from "../utils";
import { TestScriptPair } from "../interfaces/table";
import { testParser } from "../utils/test-parser";

/**
 * Command handler for the `hopp-cli test` or `hopp-cli run -c <config>` commands
 * @param context The initial CLI context object
 */
export const collectionCommander = async (
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
  } else {
    context.config = await checkFileURL(context.config!);
  }
  const collectionArray = JSON.parse(
    (await fs.readFile(context.config!)).toString()
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
      chalk.yellowBright("Collection JSON parsed! Executing requests...")
    );
    const tableStream = createStream({
      columnDefault: {
        width: 30,
        alignment: "center",
        verticalAlignment: "middle",
        wrapWord: true,
      },
      columnCount: 4,
    });
    tableStream.write([
      chalk.bold(chalk.cyanBright("PATH")),
      chalk.bold(chalk.cyanBright("METHOD")),
      chalk.bold(chalk.cyanBright("ENDPOINT")),
      chalk.bold(chalk.cyanBright("STATUS CODE")),
    ]);
    const responses: TestScriptPair[] = [];
    for (const x of collectionArray) {
      await requestParser(x, tableStream, responses, debug);
    }
    process.stdout.write("\n");

    if (responses && responses.length > 0) {
      let exitCode: number = 0,
        testRes: number = 0,
        totalFailing: number = 0;

      for (const test of responses) {
        if (test.testScript && test.testScript.trim().length > 0) {
          console.log(
            chalk.yellowBright(
              `\nRunning tests for ${chalk.bold(test.name)}...`
            )
          );
          testRes = await testParser(test);
          totalFailing += testRes;
        }
      }

      exitCode = totalFailing > 0 ? 1 : 0;
      console.log({ exitCode });
      process.exit(exitCode);
    }
  } else {
    throw errors.HOPP003;
  }
};
