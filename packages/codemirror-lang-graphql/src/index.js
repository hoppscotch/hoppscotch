import { parser } from "./syntax.grammar"
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  foldInside,
  delimitedIndent,
} from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"

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
        Comment: t.lineComment,
        Name: t.propertyName,
        StringValue: t.string,
        IntValue: t.integer,
        FloatValue: t.float,
        NullValue: t.null,
        BooleanValue: t.bool,
        Comma: t.separator,
        "OperationDefinition/Name": t.definition(t.function(t.variableName)),
        "OperationType TypeKeyword SchemaKeyword FragmentKeyword OnKeyword DirectiveKeyword RepeatableKeyword SchemaKeyword ExtendKeyword ScalarKeyword InterfaceKeyword UnionKeyword EnumKeyword InputKeyword ImplementsKeyword": t.keyword,
        "ExecutableDirectiveLocation TypeSystemDirectiveLocation": t.atom,
        "DirectiveName!": t.annotation,
        "\"{\" \"}\"": t.brace,
        "\"(\" \")\"": t.paren,
        "\"[\" \"]\"": t.squareBracket,
        "Type! NamedType": t.typeName,
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
