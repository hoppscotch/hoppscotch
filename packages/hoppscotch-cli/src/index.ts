import chalk from "chalk";
import { program } from "commander";
import * as E from "fp-ts/Either";
import { version } from "../package.json";
import { test } from "./commands/test";
import { handleError } from "./handlers/error";

const accent = chalk.greenBright;

/**
 * * Program Default Configuration
 */
const CLI_BEFORE_ALL_TXT = `hopp: The ${accent(
  "Hoppscotch"
)} CLI - Version ${version} (${accent(
  "https://hoppscotch.io"
)}) ${chalk.black.bold.bgYellowBright(" ALPHA ")} \n`;

const CLI_AFTER_ALL_TXT = `\nFor more help, head on to ${accent(
  "https://docs.hoppscotch.io/cli"
)}`;

program
  .name("hopp")
  .version(version, "-v, --ver", "see the current version of hopp-cli")
  .usage("[options or commands] arguments")
  .addHelpText("beforeAll", CLI_BEFORE_ALL_TXT)
  .addHelpText("after", CLI_AFTER_ALL_TXT)
  .configureHelp({
    optionTerm: (option) => accent(option.flags),
    subcommandTerm: (cmd) => accent(cmd.name(), cmd.usage()),
    argumentTerm: (arg) => accent(arg.name()),
  })
  .addHelpCommand(false)
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
    "<file_path>",
    "path to a hoppscotch collection.json file for CI testing"
  )
  .option("-e, --env <file_path>", "path to an environment variables json file")
  .allowExcessArguments(false)
  .allowUnknownOption(false)
  .description("running hoppscotch collection.json file")
  .addHelpText(
    "after",
    `\nFor help, head on to ${accent("https://docs.hoppscotch.io/cli#test")}`
  )
  .action(async (path, options) => await test(path, options)());

export const cli = async (args: string[]) => {
  try {
    await program.parseAsync(args);
  } catch (e) {}
};
