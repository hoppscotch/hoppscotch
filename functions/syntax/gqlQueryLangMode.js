export function defineGQLLanguageMode(ace) {
  // Highlighting
  ace.define(
    "ace/mode/gql-query-highlight",
    ["require", "exports", "ace/lib/oop", "ace/mode/text_highlight_rules"],
    (aceRequire, exports) => {
      const oop = aceRequire("ace/lib/oop")

      const TextHighlightRules = aceRequire("ace/mode/text_highlight_rules").TextHighlightRules

      const GQLQueryTextHighlightRules = function () {
        const keywords =
          "type|interface|union|enum|schema|input|implements|extends|scalar|fragment|query|mutation|subscription"

        const dataTypes = "Int|Float|String|ID|Boolean"

        const literalValues = "true|false|null"

        const escapeRe = /\\(?:u[\da-fA-f]{4}|.)/

        const keywordMapper = this.createKeywordMapper(
          {
            keyword: keywords,
            "storage.type": dataTypes,
            "constant.language": literalValues,
          },
          "identifier"
        )

        this.$rules = {
          start: [
            {
              token: "comment",
              regex: "#.*$",
            },
            {
              token: "paren.lparen",
              regex: /[\[({]/,
              next: "start",
            },
            {
              token: "paren.rparen",
              regex: /[\])}]/,
            },
            {
              token: keywordMapper,
              regex: "[a-zA-Z_][a-zA-Z0-9_$]*\\b",
            },
            {
              token: "string", // character
              regex: `'(?:${escapeRe}|.)?'`,
            },
            {
              token: "string.start",
              regex: '"',
              stateName: "qqstring",
              next: [
                { token: "string", regex: /\\\s*$/, next: "qqstring" },
                { token: "constant.language.escape", regex: escapeRe },
                { token: "string.end", regex: '"|$', next: "start" },
                { defaultToken: "string" },
              ],
            },
            {
              token: "string.start",
              regex: "'",
              stateName: "singleQuoteString",
              next: [
                { token: "string", regex: /\\\s*$/, next: "singleQuoteString" },
                { token: "constant.language.escape", regex: escapeRe },
                { token: "string.end", regex: "'|$", next: "start" },
                { defaultToken: "string" },
              ],
            },
            {
              token: "constant.numeric",
              regex: /\d+\.?\d*[eE]?[\+\-]?\d*/,
            },
            {
              token: "variable",
              regex: /\$[_A-Za-z][_0-9A-Za-z]*/,
            },
          ],
        }
        this.normalizeRules()
      }

      oop.inherits(GQLQueryTextHighlightRules, TextHighlightRules)

      exports.GQLQueryTextHighlightRules = GQLQueryTextHighlightRules
    }
  )

  // Language Mode Definition
  ace.define(
    "ace/mode/gql-query",
    ["require", "exports", "ace/mode/text", "ace/mode/gql-query-highlight"],
    (aceRequire, exports) => {
      const oop = aceRequire("ace/lib/oop")
      const TextMode = aceRequire("ace/mode/text").Mode
      const GQLQueryTextHighlightRules = aceRequire("ace/mode/gql-query-highlight")
        .GQLQueryTextHighlightRules
      const FoldMode = aceRequire("ace/mode/folding/cstyle").FoldMode

      const Mode = function () {
        this.HighlightRules = GQLQueryTextHighlightRules
        this.foldingRules = new FoldMode()
      }

      oop.inherits(Mode, TextMode)

      exports.Mode = Mode
    }
  )
}
