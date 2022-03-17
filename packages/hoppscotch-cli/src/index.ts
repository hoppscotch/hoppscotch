import chalk from "chalk";
import { program } from "commander";
import * as E from "fp-ts/Either";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import { version } from "../package.json";
import { run } from "./commands";
import { handleError } from "./handlers/error";

/**
 * * Program Default Configuration
 */
program
  .name("hopp")
  .version(version, "-v, --ver", "see the current version of hopp-cli")
  .usage("[options or commands] arguments")
  .addHelpText("beforeAll", `hopp: The ${chalk.greenBright("Hoppscotch")} CLI - Version ${version} (${chalk.greenBright("https://hoppscotch.io")})\n`)
  .addHelpText("afterAll", `\nFor more help, head on to ${chalk.greenBright("https://docs.hoppscotch.io/")}`)
  .configureHelp({
    optionTerm: (option) =>
      chalk.greenBright(
        option.flags
      ),
    subcommandTerm: (cmd) =>
      chalk.greenBright(
        cmd.name(),
        cmd.usage()
      ),
    argumentTerm: (arg) =>
      chalk.greenBright(
        arg.name()
      )
  });

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
  .action(async (path) => await run(path)());

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
