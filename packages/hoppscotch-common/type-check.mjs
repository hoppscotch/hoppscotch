import fs from "fs"
import { glob } from "glob"
import path from "path"
import ts from "typescript"
import vueTsc from "vue-tsc"

import { fileURLToPath } from "url"

/**
 * Helper function to find files to perform type check on
 */
const findFilesToPerformTypeCheck = (directoryPaths, filePatterns) => {
  const files = []

  directoryPaths.forEach((directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory not found: ${directoryPath}`)
      process.exit(1)
    }

    files.push(
      ...glob.sync(filePatterns, {
        cwd: directoryPath,
        ignore: ["**/__tests__/**", "**/*.d.ts"],
        absolute: true,
      })
    )
  })
  return files
}

// Derive the current file's directory path `__dirname` from the URL of this module `__filename`
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define the directory paths and file patterns to perform type checks on
const directoryPaths = [path.resolve(__dirname, "src", "services")]
const filePatterns = ["**/*.ts"]

const tsConfigFileName = path.resolve(__dirname, "tsconfig.json")
const tsConfig = ts.readConfigFile(tsConfigFileName, ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(
  tsConfig.config,
  ts.sys,
  __dirname
)

const files = findFilesToPerformTypeCheck(directoryPaths, filePatterns)

const host = ts.createCompilerHost(options)
const program = vueTsc.createProgram({
  rootNames: files,
  options: { ...options, noEmit: true },
  host,
})

// Perform type checking
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  // Filter diagnostics to include only errors from files in the specified directory
  .filter(({ file }) => {
    if (!file) {
      return false
    }
    return directoryPaths.some((directoryPath) =>
      path.resolve(file.fileName).includes(directoryPath)
    )
  })

if (!diagnostics.length) {
  console.log("Type checking passed.")

  // Success
  process.exit(0)
}

console.log("TypeScript diagnostics:")

const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: host.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
}

const formattedDiagnostics = ts.formatDiagnosticsWithColorAndContext(
  diagnostics,
  formatHost
)
console.error(formattedDiagnostics)

// Failure
process.exit(1)
