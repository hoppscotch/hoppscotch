import {parser} from "./syntax.grammar"
import {LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside, delimitedIndent} from "@codemirror/language"
import {styleTags, tags as t} from "@codemirror/highlight"

export const GQLLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({closing: ")", align: false})
      }),
      foldNodeProp.add({
        Application: foldInside
      }),
      styleTags({
        Name: t.propertyName,
        OperationType: t.keyword,
        BooleanValue: t.bool,
        StringValue: t.string,
        IntValue: t.number,
        FloatValue: t.number,
        NullValue: t.null,
        ObjectValue: t.brace,
        Comment: t.lineComment,
      })
    ]
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", '"', '"""'] }
  }
})

export function GQL() {
  return new LanguageSupport(GQLLanguage)
}
