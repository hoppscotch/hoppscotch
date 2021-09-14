import { resolve } from "path"
import { Module } from "@nuxt/types"
import ts from "typescript"
import chokidar from "chokidar"

const { readdir, writeFile } = require("fs").promises

function titleCase(str: string): string {
  return str[0].toUpperCase() + str.substring(1)
}

async function* getFilesInDir(dir: string): AsyncIterable<string> {
  const dirents = await readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFilesInDir(res)
    } else {
      yield res
    }
  }
}

async function getAllVueComponentPaths(): Promise<string[]> {
  const vueFilePaths: string[] = []

  for await (const f of getFilesInDir("./components")) {
    if (f.endsWith(".vue")) {
      const componentsIndex = f.split("/").indexOf("components")

      vueFilePaths.push(`./${f.split("/").slice(componentsIndex).join("/")}`)
    }
  }

  return vueFilePaths
}

function resolveComponentName(filename: string): string {
  const index = filename.split("/").indexOf("components")

  return filename
    .split("/")
    .slice(index + 1)
    .filter((x) => x !== "index.vue") // Remove index.vue
    .map((x) => x.split(".vue")[0]) // Remove extension
    .filter((x) => x.toUpperCase() !== x.toLowerCase()) // Remove non-word stuff
    .map((x) => titleCase(x)) // titlecase it
    .join("")
}

function createTSImports(components: [string, string][]) {
  return components.map(([componentName, componentPath]) => {
    return ts.factory.createImportDeclaration(
      undefined,
      undefined,
      ts.factory.createImportClause(
        false,
        ts.factory.createIdentifier(componentName),
        undefined
      ),
      ts.factory.createStringLiteral(componentPath)
    )
  })
}

function createTSProps(components: [string, string][]) {
  return components.map(([componentName]) => {
    return ts.factory.createPropertySignature(
      undefined,
      ts.factory.createIdentifier(componentName),
      undefined,
      ts.factory.createTypeQueryNode(ts.factory.createIdentifier(componentName))
    )
  })
}

function generateTypeScriptDef(components: [string, string][]) {
  const statements = [
    ...createTSImports(components),
    ts.factory.createModuleDeclaration(
      undefined,
      [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      ts.factory.createIdentifier("global"),
      ts.factory.createModuleBlock([
        ts.factory.createInterfaceDeclaration(
          undefined,
          undefined,
          ts.factory.createIdentifier("__VLS_GlobalComponents"),
          undefined,
          undefined,
          [...createTSProps(components)]
        ),
      ]),
      ts.NodeFlags.ExportContext |
        ts.NodeFlags.GlobalAugmentation |
        ts.NodeFlags.ContextFlags
    ),
  ]

  const source = ts.factory.createSourceFile(
    statements,
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    ts.NodeFlags.None
  )

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  })

  return printer.printFile(source)
}

async function generateShim() {
  const results = await getAllVueComponentPaths()
  const fileComponentNameCombo: [string, string][] = results.map((x) => [
    resolveComponentName(x),
    x,
  ])
  const typescriptString = generateTypeScriptDef(fileComponentNameCombo)

  await writeFile(resolve("shims-volar.d.ts"), typescriptString)
}

const module: Module<{}> = async function () {
  if (!this.nuxt.options.dev) return

  await generateShim()

  chokidar.watch(resolve("../components/")).on("all", async () => {
    await generateShim()
  })
}

export default module
