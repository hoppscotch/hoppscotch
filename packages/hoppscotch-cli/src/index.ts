import chalk from "chalk";
import { program } from "commander";
import * as E from "fp-ts/Either";
import { version } from "../package.json";
import { test } from "./commands/test";
import { handleError } from "./handlers/error";

/**
 * * Program Default Configuration
 */
const CLI_BEFORE_ALL_TXT = `hopp: The ${chalk.greenBright(
  "Hoppscotch"
)} CLI - Version ${version} (${chalk.greenBright("https://hoppscotch.io")})\n`;

const CLI_AFTER_ALL_TXT = `\nFor more help, head on to ${chalk.greenBright(
  "https://docs.hoppscotch.io/"
)}`;

program
  .name("hopp")
  .version(version, "-v, --ver", "see the current version of hopp-cli")
  .usage("[options or commands] arguments")
  .addHelpText("beforeAll", CLI_BEFORE_ALL_TXT)
  .addHelpText("afterAll", CLI_AFTER_ALL_TXT)
  .configureHelp({
    optionTerm: (option) => chalk.greenBright(option.flags),
    subcommandTerm: (cmd) => chalk.greenBright(cmd.name(), cmd.usage()),
    argumentTerm: (arg) => chalk.greenBright(arg.name()),
  })
  .addHelpCommand()
  .showHelpAfterError(true);

program.exitOverride().configureOutput({
  writeErr: (str) => program.help(),
  outputError: (str, write) =>
    handleError({ code: "INVALID_ARGUMENT", data: E.toError(str) }),
});

/**
 * * CLI Commands
 */
program
  .command("test")
  .argument(
    "[file]",
    "path to a hoppscotch collection.json file for CI testing"
  )
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .description("running hoppscotch collection.json file")
  .action(async (path) => await test(path)());

export const cli = async (args: string[]) => {
  try {
    await program.parseAsync(args);
  } catch (e) {}
};
