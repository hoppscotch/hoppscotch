import * as esprima from "esprima"
import { LinterDefinition, LinterResult } from "./linter"
import { performPreRequestLinting } from "~/helpers/tern"

const linter: LinterDefinition = async (text) => {
  let results: LinterResult[] = []

  // Semantic linting
  const semanticLints = await performPreRequestLinting(text)

  results = results.concat(
    semanticLints.map((lint: any) => ({
      from: lint.from,
      to: lint.to,
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
            line: err.lineNumber - 1,
            ch: err.column - 1,
          }

          const toPos: { line: number; ch: number } = {
            line: err.lineNumber - 1,
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
  } catch (e) {
    const fromPos: { line: number; ch: number } = {
      line: e.lineNumber - 1,
      ch: e.column - 1,
    }

    const toPos: { line: number; ch: number } = {
      line: e.lineNumber - 1,
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
