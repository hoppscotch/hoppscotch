export type LinterResult = {
  message: string
  severity: "warning" | "error"
  from: { line: number; ch: number }
  to: { line: number; ch: number }
}
export type LinterDefinition = (text: string) => Promise<LinterResult[]>
