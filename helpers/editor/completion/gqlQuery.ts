import { Ref } from "@nuxtjs/composition-api"
import { GraphQLSchema } from "graphql"
import { getAutocompleteSuggestions } from "graphql-language-service-interface"
import { Completer, CompleterResult, CompletionEntry } from "."

const completer: (schemaRef: Ref<GraphQLSchema | null>) => Completer =
  (schemaRef: Ref<GraphQLSchema | null>) => (text, completePos, tokenPos) => {
    if (!schemaRef.value) return Promise.resolve(null)

    const completions = getAutocompleteSuggestions(schemaRef.value, text, {
      line: completePos.line,
      character: completePos.ch,
    } as any)

    return Promise.resolve(<CompleterResult>{
      start: tokenPos.start,
      end: tokenPos.end,
      completions: completions.map(
        (x, i) =>
          <CompletionEntry>{
            text: x.label!,
            meta: x.detail!,
            score: completions.length - i,
          }
      ),
    })
  }

export default completer
