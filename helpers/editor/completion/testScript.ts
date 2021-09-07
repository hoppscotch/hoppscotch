import { convertIndexToLineCh } from "../utils"
import { Completer, CompletionEntry } from "."
import { getTestScriptCompletions } from "~/helpers/tern"

export const completer: Completer = async (text, completePos) => {
  const results = await getTestScriptCompletions(
    text,
    completePos.line,
    completePos.ch
  )

  const start = convertIndexToLineCh(text, results.start)
  const end = convertIndexToLineCh(text, results.end)

  const completions = results.completions.map((completion: any, i: number) => {
    return <CompletionEntry>{
      text: completion.name,
      meta: completion.isKeyword ? "keyword" : completion.type,
      score: results.completions.length - i,
    }
  })

  return {
    start,
    end,
    completions,
  }
}

export default completer
