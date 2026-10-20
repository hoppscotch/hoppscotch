import {
  format,
  applyEdits,
  parse,
  ParseError,
  printParseErrorCode,
} from "jsonc-parser"

export function prettifyJSONC(str: string) {
  const editResult = format(str, undefined, {
    insertSpaces: true,
    tabSize: 2,
    insertFinalNewline: true,
  })
  return applyEdits(str, editResult)
}

function getJSONCParseErrors(str: string): ParseError[] {
  const errors: ParseError[] = []
  parse(str, errors, { allowTrailingComma: true })
  return errors
}

export function isValidJSONC(str: string): boolean {
  return getJSONCParseErrors(str).length === 0
}

export function prettifyJSONCWithValidation(str: string) {
  const errors = getJSONCParseErrors(str)
  if (errors.length > 0) {
    throw new SyntaxError(printParseErrorCode(errors[0].error))
  }
  return prettifyJSONC(str)
}
