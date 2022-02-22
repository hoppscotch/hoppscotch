import { program } from "commander";
import * as E from "fp-ts/Either";
import { version } from "../package.json";
import { run, test } from "./commands";
import { handleError } from "./handlers";

/**
 * * Program Default Configuration
 */
program
  .name("hopp-cli")
  .version(version, "-v, --ver", "see the current version of hopp-cli")
  .usage("[options or commands] arguments");

program.exitOverride().configureOutput({
  writeErr: (str) => {},
  outputError: (str, write) => {},
});

/**
 * * CLI Flags
 */
program
  .command("run")
  .argument(
    "[file]",
    "path to a hoppscotch collection.json file for CI testing"
  )
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .description("running hoppscotch collection.json file")
  .action(async (context, options) => await run(context, options)());

program
  .command("test")
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .description("interactive hoppscotch testing with debugger")
  .setOptionValue("interactive", true)
  .action(async (context, options) => await test(context, options)());

program
  .command("help", { isDefault: true, hidden: true })
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .action(() => program.help());

export const cli = async (args: string[]) => {
  try {
    await program.parseAsync(args);
  } catch (e) {
    handleError({ code: "UNKNOWN_ERROR", data: E.toError(e) });
  }
};
