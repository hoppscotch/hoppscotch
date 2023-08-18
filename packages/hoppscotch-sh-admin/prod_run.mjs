#!/usr/local/bin/node
import { execSync } from "child_process"
import fs from "fs"

const envFileContent = Object.entries(process.env)
  .filter(([env]) => env.startsWith("VITE_"))
  .map(([env, val]) => `${env}=${
    (val.startsWith("\"") && val.endsWith("\""))
      ? val
      : `"${val}"`
  }`)
  .join("\n")

fs.writeFileSync("build.env", envFileContent)

execSync(`npx import-meta-env -x build.env -e build.env -p "/site/**/*"`)

fs.rmSync("build.env")
