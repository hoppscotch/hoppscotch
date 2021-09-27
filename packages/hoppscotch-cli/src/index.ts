import { program } from "commander";

import { version } from "../package.json";
import { test } from "./commands";
import { errorHandler } from "./utils";

/**
 * * Program Default Configuration
 */
program
  .name("hopp-cli")
  .version(version, "-v, --ver", "see the current version of the CLI")
  .usage("[options or commands] arguments");

program.exitOverride().configureOutput({
  writeErr: (str) => {},
  outputError: (str, write) => {},
});

/**
 * * CLI Flags
 */
program
  .option(
    "-c, --config <file>",
    "path to a Hoppscotch collection.json file for CI testing"
  )
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .setOptionValue("interactive", false)
  .action(test);

program
  .command("test")
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .description("interactive Hoppscotch testing through CLI")
  .setOptionValue("interactive", true)
  .action(test);

program
  .command("help", { isDefault: true, hidden: true })
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .action(() => program.help());

export const run = async (args: string[]) => {
  try {
    await program.parseAsync(args);
  } catch (err: any) {
    errorHandler(err);
  }
  const options = program.opts();
  if (Object.keys(options).length === 0) {
    program.help();
  }
};
