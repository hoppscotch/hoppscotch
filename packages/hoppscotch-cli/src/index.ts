import { program } from "commander";
import { version } from "../package.json";
import { test, run } from "./commands";
import { errorHandler } from "./handlers";

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
  .action((context, options) =>
    run({
      interactive: options.interactive,
      path: context,
    })
  );

program
  .command("test")
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .description("interactive hoppscotch testing with debugger")
  .setOptionValue("interactive", true)
  .action((context) => test(context, true));

program
  .command("help", { isDefault: true, hidden: true })
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .action(() => program.help());

export const cli = async (args: string[]) => {
  try {
    await program.parseAsync(args);
  } catch (err: any) {
    errorHandler(err);
  }
  const options = program.opts();
  if (Object.keys(options).length === 0) {
    try {
      program.help();
    } catch (err: any) {
      errorHandler(err);
    }
  }
};
