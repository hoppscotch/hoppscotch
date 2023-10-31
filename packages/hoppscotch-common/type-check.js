const path = require("path")
const ts = require("typescript")
const vueTsc = require("vue-tsc")
const glob = require("glob")

const tsConfigFileName = "tsconfig.json"
const tsConfig = ts.readConfigFile(tsConfigFileName, ts.sys.readFile)
const { options } = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, "./")

const findTypeScriptFiles = (directoryPath, filePattern) => {
  const files = glob.sync(filePattern, {
    cwd: directoryPath,
    ignore: "**/__tests__/**",
  })

  const fileList = files
    // Narrow down to `TS` files
    .filter((file) => file.endsWith(".ts"))
    // Append the path
    .map((file) => path.join(directoryPath, file))

  return fileList
}

const directoryPath = path.resolve(__dirname, "src", "services")
const filePattern = "**/*.ts"

const tsFiles = findTypeScriptFiles(directoryPath, filePattern)

const host = ts.createCompilerHost(options)
const program = vueTsc.createProgram({
  rootNames: tsFiles,
  options: { ...options, noEmit: true },
  host,
})

// Perform type checking
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  // Filter diagnostics to include only errors from files in the specified directory
  .filter(({ file }) => {
    return path.resolve(file.fileName).includes(directoryPath)
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
