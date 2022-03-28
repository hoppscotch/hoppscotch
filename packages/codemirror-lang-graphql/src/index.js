import { parser } from "./syntax.grammar"
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  delimitedIndent,
} from "@codemirror/language"
import { styleTags, tags as t } from "@codemirror/highlight"

export const GQLLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        "SelectionSet FieldsDefinition ObjectValue SchemaDefinition RootTypeDef":
          delimitedIndent({ closing: "}", align: true }),
      }),
      foldNodeProp.add({
        Application: foldInside,
        "SelectionSet FieldsDefinition ObjectValue RootOperationTypeDefinition RootTypeDef":
          (node) => {
            return {
              from: node.from,
              to: node.to,
            }
          },
      }),
      styleTags({
        Name: t.definition(t.variableName),
        "OperationDefinition/Name": t.definition(t.function(t.variableName)),
        OperationType: t.keyword,
        BooleanValue: t.bool,
        StringValue: t.string,
        IntValue: t.number,
        FloatValue: t.number,
        NullValue: t.null,
        ObjectValue: t.brace,
        Comment: t.lineComment,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", '"', '"""'] },
  },
})

export function GQL() {
  return new LanguageSupport(GQLLanguage)
}
