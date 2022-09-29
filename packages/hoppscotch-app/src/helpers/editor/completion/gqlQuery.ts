import { Ref } from "vue"
import { GraphQLSchema } from "graphql"
import { getAutocompleteSuggestions } from "graphql-language-service-interface"
import { Completer, CompleterResult, CompletionEntry } from "."

const completer: (schemaRef: Ref<GraphQLSchema | null>) => Completer =
  (schemaRef: Ref<GraphQLSchema | null>) => (text, completePos) => {
    if (!schemaRef.value) return Promise.resolve(null)

    const completions = getAutocompleteSuggestions(schemaRef.value, text, {
      line: completePos.line,
      character: completePos.ch,
    } as any)

    return Promise.resolve(<CompleterResult>{
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
