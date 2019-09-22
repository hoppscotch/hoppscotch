const axios = require("axios");
const fs = require("fs");
const { spawnSync } = require("child_process");
const runCommand = (command, args) =>
  spawnSync(command, args)
    .stdout.toString()
    .replace(/\n/g, "");

const FAIL_ON_ERROR = false;
const PW_BUILD_DATA_DIR = "./.postwoman";
const IS_DEV_MODE = process.argv.includes("--dev");

try {
  (async () => {
    // Create the build data directory if it does not exist.
    if (!fs.existsSync(PW_BUILD_DATA_DIR)) {
      fs.mkdirSync(PW_BUILD_DATA_DIR);
    }

    let version = {};
    // Get the current version name as the tag from Git.
    version.name = process.env.TRAVIS_TAG || runCommand("git", ["tag"]);

    // FALLBACK: If version.name was unset, let's grab it from GitHub.
    if (!version.name) {
      version.name = (await axios
        .get("https://api.github.com/repos/liyasthomas/postwoman/releases")
        // If we can't get it from GitHub, we'll resort to getting it from package.json
        .catch(ex => ({
          data: [{ tag_name: require("./package.json").version }]
        }))).data[0]["tag_name"];
    }

    // Get the current version hash as the short hash from Git.
    version.hash = runCommand("git", ["rev-parse", "--short", "HEAD"]);
    // Get the 'variant' name as the branch, if it's not master.
    version.variant =
      process.env.TRAVIS_BRANCH ||
      runCommand("git", ["branch"])
        .split("* ")[1]
        .split(" ")[0] + (IS_DEV_MODE ? " - DEV MODE" : "");
    if (["", "master"].includes(version.variant))
      delete version.variant;

    // Write version data into a file
    fs.writeFileSync(
      PW_BUILD_DATA_DIR + "/version.json",
      JSON.stringify(version)
    );
  })();
} catch (ex) {
  console.error(ex);
  process.exit(FAIL_ON_ERROR ? 1 : 0);
}
