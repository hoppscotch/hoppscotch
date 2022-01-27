import fs from "fs/promises";
import inquirer from "inquirer";
import chalk from "chalk";
import { createStream } from "table";
import fuzzyPath from "inquirer-fuzzy-path";
inquirer.registerPrompt("fuzzypath", fuzzyPath);

import { context } from "../interfaces";
import {
  errors,
  isRESTCollection,
  requestParser,
  checkFileURL,
  parseOptions,
} from "../utils";

/**
 * Command handler for the `hopp-cli test` or `hopp-cli run -c <config>` commands
 * @param context The initial CLI context object
 */
const commandHandler = async (context: context, debug: boolean = false) => {
  if (context.interactive) {
    await parseOptions(context);
  } else {
    context.config = await checkFileURL(context.config!);
  }
  const collectionArray = JSON.parse(
    (await fs.readFile(context.config!)).toString()
  );
  const valid = [];
  for (const [idx, val] of collectionArray.entries()) {
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
    for (const x of collectionArray) {
      await requestParser(x, tableStream, debug);
    }
  } else {
    throw errors.HOPP003;
  }
};

export default commandHandler;
