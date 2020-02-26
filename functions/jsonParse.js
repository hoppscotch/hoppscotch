/**
 *  Copyright (c) 2019 GraphQL Contributors
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * This JSON parser simply walks the input, generating an AST. Use this in lieu
 * of JSON.parse if you need character offset parse errors and an AST parse tree
 * with location information.
 *
 * If an error is encountered, a SyntaxError will be thrown, with properties:
 *
 *   - message: string
 *   - start: int - the start inclusive offset of the syntax error
 *   - end: int - the end exclusive offset of the syntax error
 *
 */
export default function jsonParse(str) {
  string = str
  strLen = str.length
  start = end = lastEnd = -1
  ch()
  lex()
  const ast = parseObj()
  expect("EOF")
  return ast
}

let string
let strLen
let start
let end
let lastEnd
let code
let kind

function parseObj() {
  const nodeStart = start
  const members = []
  expect("{")
  if (!skip("}")) {
    do {
      members.push(parseMember())
    } while (skip(","))
    expect("}")
  }
  return {
    kind: "Object",
    start: nodeStart,
    end: lastEnd,
    members,
  }
}

function parseMember() {
  const nodeStart = start
  const key = kind === "String" ? curToken() : null
  expect("String")
  expect(":")
  const value = parseVal()
  return {
    kind: "Member",
    start: nodeStart,
    end: lastEnd,
    key,
    value,
  }
}

function parseArr() {
  const nodeStart = start
  const values = []
  expect("[")
  if (!skip("]")) {
    do {
      values.push(parseVal())
    } while (skip(","))
    expect("]")
  }
  return {
    kind: "Array",
    start: nodeStart,
    end: lastEnd,
    values,
  }
}

function parseVal() {
  switch (kind) {
    case "[":
      return parseArr()
    case "{":
      return parseObj()
    case "String":
    case "Number":
    case "Boolean":
    case "Null":
      const token = curToken()
      lex()
      return token
  }
  return expect("Value")
}

function curToken() {
  return { kind, start, end, value: JSON.parse(string.slice(start, end)) }
}

function expect(str) {
  if (kind === str) {
    lex()
    return
  }

  let found
  if (kind === "EOF") {
    found = "[end of file]"
  } else if (end - start > 1) {
    found = "`" + string.slice(start, end) + "`"
  } else {
    const match = string.slice(start).match(/^.+?\b/)
    found = "`" + (match ? match[0] : string[start]) + "`"
  }

  throw syntaxError(`Expected ${str} but found ${found}.`)
}

function syntaxError(message) {
  return { message, start, end }
}

function skip(k) {
  if (kind === k) {
    lex()
    return true
  }
}

function ch() {
  if (end < strLen) {
    end++
    code = end === strLen ? 0 : string.charCodeAt(end)
  }
}

function lex() {
  lastEnd = end

  while (code === 9 || code === 10 || code === 13 || code === 32) {
    ch()
  }

  if (code === 0) {
    kind = "EOF"
    return
  }

  start = end

  switch (code) {
    // "
    case 34:
      kind = "String"
      return readString()
    // -, 0-9
    case 45:
    case 48:
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
    case 56:
    case 57:
      kind = "Number"
      return readNumber()
    // f
    case 102:
      if (string.slice(start, start + 5) !== "false") {
        break
      }
      end += 4
      ch()

      kind = "Boolean"
      return
    // n
    case 110:
      if (string.slice(start, start + 4) !== "null") {
        break
      }
      end += 3
      ch()

      kind = "Null"
      return
    // t
    case 116:
      if (string.slice(start, start + 4) !== "true") {
        break
      }
      end += 3
      ch()

      kind = "Boolean"
      return
  }

  kind = string[start]
  ch()
}

function readString() {
  ch()
  while (code !== 34 && code > 31) {
    if (code === 92) {
      // \
      ch()
      switch (code) {
        case 34: // "
        case 47: // /
        case 92: // \
        case 98: // b
        case 102: // f
        case 110: // n
        case 114: // r
        case 116: // t
          ch()
          break
        case 117: // u
          ch()
          readHex()
          readHex()
          readHex()
          readHex()
          break
        default:
          throw syntaxError("Bad character escape sequence.")
      }
    } else if (end === strLen) {
      throw syntaxError("Unterminated string.")
    } else {
      ch()
    }
  }

  if (code === 34) {
    ch()
    return
  }

  throw syntaxError("Unterminated string.")
}

function readHex() {
  if (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 70) || // A-F
    (code >= 97 && code <= 102) // a-f
  ) {
    return ch()
  }
  throw syntaxError("Expected hexadecimal digit.")
}

function readNumber() {
  if (code === 45) {
    // -
    ch()
  }

  if (code === 48) {
    // 0
    ch()
  } else {
    readDigits()
  }

  if (code === 46) {
    // .
    ch()
    readDigits()
  }

  if (code === 69 || code === 101) {
    // E e
    ch()
    if (code === 43 || code === 45) {
      // + -
      ch()
    }
    readDigits()
  }
}

function readDigits() {
  if (code < 48 || code > 57) {
    // 0 - 9
    throw syntaxError("Expected decimal digit.")
  }
  do {
    ch()
  } while (code >= 48 && code <= 57) // 0 - 9
}
