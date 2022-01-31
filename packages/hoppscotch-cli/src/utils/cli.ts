import inquirer from "inquirer";
import fuzzyPath from "inquirer-fuzzy-path";
inquirer.registerPrompt("fuzzypath", fuzzyPath);
import { CLIContext } from "../interfaces";
import { checkFileURL } from ".";

/**
 * Parse options to collect JSON file path, through interactive CLI
 * @param context The initial CLI context object
 * @returns The parsed absolute file path string
 */
export const parseOptions = async (context: CLIContext): Promise<any> => {
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
