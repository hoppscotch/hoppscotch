import * as esprima from "esprima"
import { LinterDefinition, LinterResult } from "./linter"
import { performTestLinting } from "~/helpers/tern"

const linter: LinterDefinition = async (text) => {
  let results: LinterResult[] = []

  // Semantic linting
  const semanticLints = await performTestLinting(text)

  results = results.concat(
    semanticLints.map((lint: any) => ({
      from: {
        ch: lint.from.ch + 1,
        line: lint.from.line + 1,
      },
      to: {
        ch: lint.from.ch + 1,
        line: lint.to.line + 1,
      },
      severity: "error",
      message: `[semantic] ${lint.message}`,
    }))
  )

  // Syntax linting
  try {
    const res: any = esprima.parseScript(text, { tolerant: true })
    if (res.errors && res.errors.length > 0) {
      results = results.concat(
        res.errors.map((err: any) => {
          const fromPos: { line: number; ch: number } = {
            line: err.lineNumber,
            ch: err.column,
          }

          const toPos: { line: number; ch: number } = {
            line: err.lineNumber,
            ch: err.column,
          }

          return <LinterResult>{
            from: fromPos,
            to: toPos,
            message: `[syntax] ${err.description}`,
            severity: "error",
          }
        })
      )
    }
  } catch (e: any) {
    const fromPos: { line: number; ch: number } = {
      line: e.lineNumber,
      ch: e.column,
    }

    const toPos: { line: number; ch: number } = {
      line: e.lineNumber,
      ch: e.column,
    }

    results = results.concat([
      <LinterResult>{
        from: fromPos,
        to: toPos,
        message: `[syntax] ${e.description}`,
        severity: "error",
      },
    ])
  }

  return results
}

export default linter
