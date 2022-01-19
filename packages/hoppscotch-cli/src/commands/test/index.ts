import fs from "fs/promises";
import { join, extname } from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import { createStream } from "table";
import fuzzyPath from "inquirer-fuzzy-path";
inquirer.registerPrompt("fuzzypath", fuzzyPath);

import { context } from "../../schemas";
import { errors } from "../../utils";
import { isRESTCollection } from "../../schemas/collection";
import requestParser from "./request-parser";

/**
 * Command handler for the `hopp-cli test` or `hopp-cli -c <config>` commands
 * @param context The initial CLI context object
 */
const run = async (context: context) => {
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
      await requestParser(x, tableStream);
    }
  } else {
    throw errors.HOPP003;
  }
};

/**
 * Check if the file exists and check the file extension
 * @param url The input file path to check
 * @returns The absolute file URL, if the file exists
 */
const checkFileURL = async (url: string) => {
  try {
    const fileUrl = join(process.cwd(), url);
    await fs.access(fileUrl);
    if (extname(fileUrl) !== ".json") {
      console.log(
        `${chalk.red(
          ">>"
        )} Selected file is not a collection JSON. Please try again.`
      );
      throw "FileNotJSON";
    }
    return fileUrl;
  } catch (err: any) {
    if (err.code && err.code === "ENOENT") {
      throw errors.HOPP001;
    }
    throw err;
  }
};

/**
 * Parse options to collect JSON file path, through interactive CLI
 * @param context The initial CLI context object
 * @returns The parsed absolute file path string
 */
const parseOptions = async (context: context): Promise<any> => {
  try {
    const { fileUrl }: { fileUrl: string } = await inquirer.prompt([
      {
        type: "fuzzypath",
        name: "fileUrl",
        message: "Enter your Hoppscotch collection.json path:",
        excludePath: (nodePath: string) => {
          return nodePath.includes("node_modules");
        },
        excludeFilter: (nodePath: string) =>
          nodePath == "." || nodePath.startsWith("."),
        itemType: "file",
        suggestOnly: false,
        rootPath: ".",
        depthLimit: 5,
        emptyText: "No results...try searching for some other file!",
      },
    ]);

    context.config = await checkFileURL(fileUrl);
  } catch (err) {
    return parseOptions(context);
  }
};

export default run;
