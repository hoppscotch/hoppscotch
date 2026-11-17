/**
 * Where a script's network calls send, read without running it. Best-effort:
 * a call whose destination it can't read counts as unknown, never as none.
 */
export interface ScriptSends {
  /** Hosts its calls name outright. */
  hosts: string[]
  /** Calls whose destination only a run can tell. */
  unknown: number
}

type Token =
  | { kind: "name"; value: string }
  | {
      kind: "punct"
      value: string
      /** On a closing bracket: a `/` right after it starts a regex. */
      regexAfter?: boolean
      /** On a `)`: a `{` right after it is a function expression's body. */
      fnBody?: boolean
    }
  | { kind: "string"; value: string }
  | { kind: "regex"; value: string }
  | {
      kind: "template"
      head: string
      /** Every literal part, `${}` left out. */
      text: string
      dynamic: boolean
      inner: Token[][]
    }
  | { kind: "other" }

/** Calls that send to their first argument. */
const SENDS = new Set([
  "fetch",
  "sendRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "sendBeacon",
])
/** Names that send, or run code, with no argument saying where. */
const OPAQUE = new Set(["XMLHttpRequest", "eval", "Function", "constructor"])
/** Objects a computed key could reach `fetch` through. */
const GLOBALS = new Set([
  "hopp",
  "pm",
  "pw",
  "globalThis",
  "self",
  "window",
  "this",
])
/** Objects that hold a send: passed around, they reach it unseen. */
const ROOTS = new Set(["hopp", "pm", "globalThis", "self", "window", "this"])
/** Words after which an expression starts. */
const BEFORE_EXPRESSION = new Set([
  "return",
  "typeof",
  "case",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "instanceof",
  "yield",
  "await",
])
/** Words after which `/` starts a regex, not a division. */
const BEFORE_REGEX = new Set([...BEFORE_EXPRESSION, "do", "else"])
/** Punctuators after which no expression continues. */
const ENDS_EXPRESSION = new Set([")", "]", "}", ";", "{", "=>", "++", "--"])
/** Punctuators longer than one character that change how a `/` or `{` reads. */
const MULTI_PUNCT = /=>|\+\+|--|\.\.\.|\?\.(?!\d)/y

const words = (names: Iterable<string>) => [...names].join("|")
/** A literal that reads like a call: a misread may have swallowed one. */
const CALL_LIKE = new RegExp(
  `\\b(?:${words([...SENDS, ...OPAQUE, "import"])})\\s*\\(`
)
/** A regex naming a send: a misread division may have swallowed one. */
const NAMES_SEND = new RegExp(`\\b(?:${words([...SENDS, ...OPAQUE])})\\b`)

const ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  0: "\0",
}

/** Decodes a literal's escapes, so `\x2e` reads as `.`. */
const decodeEscapes = (raw: string): string =>
  raw.replace(
    /\\(?:u\{([\da-f]+)\}|u([\da-f]{4})|x([\da-f]{2})|(\r\n|[\s\S]))/gi,
    (_, cp?: string, u?: string, x?: string, ch?: string) => {
      const code = cp ?? u ?? x
      if (code) {
        const n = parseInt(code, 16)
        return n <= 0x10ffff ? String.fromCodePoint(n) : ""
      }
      // A line continuation.
      if (!ch || /^(?:\r\n|[\r\n\u2028\u2029])$/.test(ch)) return ""
      return ESCAPES[ch] ?? ch
    }
  )

const isPunct = (token: Token | undefined, value: string) =>
  token?.kind === "punct" && token.value === value

const isName = (token: Token | undefined, value: string) =>
  token?.kind === "name" && token.value === value

/** Whether the name at `i` is a property, as in `x.return`. */
const isProperty = (tokens: Token[], i: number) =>
  isPunct(tokens[i - 1], ".") || isPunct(tokens[i - 1], "?.")

/** Whether an expression starts right after the token at `i`. */
const expressionAfter = (tokens: Token[], i: number): boolean => {
  const t = tokens[i]
  if (t?.kind === "punct") return !ENDS_EXPRESSION.has(t.value)
  return (
    t?.kind === "name" &&
    BEFORE_EXPRESSION.has(t.value) &&
    !isProperty(tokens, i)
  )
}

/** Whether a `(` about to follow opens a function expression's parameters. */
const functionExpressionAhead = (tokens: Token[]): boolean => {
  let k = tokens.length - 1
  // `function name(`, `function* name(`
  if (tokens[k]?.kind === "name" && !isName(tokens[k], "function")) k--
  if (isPunct(tokens[k], "*")) k--
  if (!isName(tokens[k], "function")) return false
  if (isName(tokens[k - 1], "async")) k--
  return expressionAfter(tokens, k - 1)
}

/**
 * Splits a script into tokens. `nested` stops at the `}` closing a template
 * `${`; the index returned is just past it.
 */
const scan = (
  src: string,
  from = 0,
  nested = false
): { tokens: Token[]; end: number } => {
  const tokens: Token[] = []
  // Open brackets: what a `/` after each one's close means.
  const groups: Array<{ regexAfter: boolean; fnBody?: boolean }> = []
  let i = from
  const regexAllowed = () => {
    const last = tokens[tokens.length - 1]
    if (!last) return true
    if (last.kind === "name")
      return (
        BEFORE_REGEX.has(last.value) && !isProperty(tokens, tokens.length - 1)
      )
    if (last.kind !== "punct") return false
    if (")]}".includes(last.value)) return !!last.regexAfter
    return last.value !== "++" && last.value !== "--"
  }
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && !/[\n\r\u2028\u2029]/.test(src[i])) i++
    } else if (c === "/" && src[i + 1] === "*") {
      const close = src.indexOf("*/", i + 2)
      i = close === -1 ? src.length : close + 2
    } else if (c === "'" || c === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== c && !/[\n\r]/.test(src[j]))
        j += src[j] === "\\" ? 2 : 1
      tokens.push({ kind: "string", value: decodeEscapes(src.slice(i + 1, j)) })
      i = j + 1
    } else if (c === "`") {
      let j = i + 1
      let head = ""
      let text = ""
      let dynamic = false
      const inner: Token[][] = []
      while (j < src.length && src[j] !== "`") {
        if (src[j] === "$" && src[j + 1] === "{") {
          const part = scan(src, j + 2, true)
          inner.push(part.tokens)
          dynamic = true
          j = part.end
          continue
        }
        const step = src[j] === "\\" ? 2 : 1
        if (!dynamic) head += src.slice(j, j + step)
        text += src.slice(j, j + step)
        j += step
      }
      tokens.push({
        kind: "template",
        head: decodeEscapes(head),
        text: decodeEscapes(text),
        dynamic,
        inner,
      })
      i = j + 1
    } else if (/[\p{L}\p{Nl}_$\\]/u.test(c)) {
      const raw =
        /^(?:[\p{L}\p{N}_$\u200c\u200d]|\\u\{[\da-f]+\}|\\u[\da-f]{4})+/iu.exec(
          src.slice(i)
        )?.[0] ?? c
      tokens.push({ kind: "name", value: decodeEscapes(raw) })
      i += raw.length
    } else if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] ?? ""))) {
      i += /^[\d.]*[\w.]*/.exec(src.slice(i))?.[0].length || 1
      tokens.push({ kind: "other" })
    } else if (c === "/" && regexAllowed()) {
      // A regex never spans lines: one that doesn't close is a division.
      let j = i + 1
      let inClass = false
      let closed = false
      for (; j < src.length && !/[\n\r]/.test(src[j]); j++) {
        if (src[j] === "\\") j++
        else if (src[j] === "[") inClass = true
        else if (src[j] === "]") inClass = false
        else if (src[j] === "/" && !inClass) {
          closed = true
          break
        }
      }
      if (closed) {
        tokens.push({ kind: "regex", value: src.slice(i + 1, j) })
        i = j + 1
        while (i < src.length && /[\w$]/.test(src[i])) i++
      } else {
        tokens.push({ kind: "punct", value: c })
        i++
      }
    } else {
      MULTI_PUNCT.lastIndex = i
      const value = MULTI_PUNCT.exec(src)?.[0] ?? c
      if (nested && value === "}" && !groups.length)
        return { tokens, end: i + 1 }
      const token: Token = { kind: "punct", value }
      const last = tokens[tokens.length - 1]
      if (value === "(") {
        groups.push({
          // `if (...) /re/`
          regexAfter:
            last?.kind === "name" &&
            /^(?:if|while|for|with)$/.test(last.value) &&
            !isProperty(tokens, tokens.length - 1),
          fnBody: functionExpressionAhead(tokens),
        })
      } else if (value === "[") {
        groups.push({ regexAfter: false })
      } else if (value === "{") {
        // After an object or a function expression, `/` divides.
        const expression =
          last?.kind === "punct" && last.value === ")"
            ? !!last.fnBody
            : expressionAfter(tokens, tokens.length - 1)
        groups.push({ regexAfter: !expression })
      } else if (")]}".includes(value)) {
        Object.assign(token, groups.pop())
      }
      tokens.push(token)
      i += value.length
    }
  }
  return { tokens, end: i }
}

const opens = (t: Token) => t.kind === "punct" && "([{".includes(t.value)
const closes = (t: Token) => t.kind === "punct" && ")]}".includes(t.value)

/** One argument's tokens from `start`, up to a `,` or `close` at its level. */
const argumentAt = (tokens: Token[], start: number, close = ")"): Token[] => {
  const out: Token[] = []
  let depth = 0
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i]
    if (depth === 0 && (isPunct(t, ",") || isPunct(t, close))) break
    if (opens(t)) depth++
    else if (closes(t)) depth--
    out.push(t)
  }
  return out
}

/** The host a URL names, when `text` holds its whole authority. */
const hostIn = (text: string, whole: boolean): string | null => {
  const url = whole
    ? text
    : /^\s*[a-z][\w+.-]*:\/\/[^/\\?#]*[/\\?#]/i.exec(text)?.[0]
  if (!url) return null
  try {
    const { protocol, host } = new URL(url)
    return /^(?:https?|wss?):$/.test(protocol) && host
      ? host.toLowerCase()
      : null
  } catch (_e) {
    return null
  }
}

/**
 * Whether `rest` only appends to what comes before it. Any other top-level
 * operator (`?:`, `||`, `-`, `=`, `in`...) can make the value something else.
 */
const onlyAppends = (rest: Token[]): boolean => {
  let depth = 0
  for (const t of rest) {
    if (opens(t)) depth++
    else if (closes(t)) depth--
    else if (depth !== 0) continue
    else if (t.kind === "punct" && !["+", ".", "?."].includes(t.value))
      return false
    else if (isName(t, "in") || isName(t, "instanceof")) return false
  }
  return true
}

/** The `url` of an object literal that names it once, and nothing overrides. */
const urlProperty = (arg: Token[]): string | null => {
  let depth = 0
  let urls = 0
  let value = -1
  for (let i = 0; i < arg.length; i++) {
    const t = arg[i]
    const key =
      depth === 1 && (isPunct(arg[i - 1], "{") || isPunct(arg[i - 1], ","))
    // A spread or computed key could set `url` too.
    if (key && (isPunct(t, "...") || isPunct(t, "["))) return null
    if (
      key &&
      (t.kind === "name" || t.kind === "string") &&
      t.value === "url"
    ) {
      urls++
      if (isPunct(arg[i + 1], ":")) value = i + 2
    }
    if (opens(t)) depth++
    // `{ ... }.x` or `{ ... } || y` is some other value.
    else if (closes(t) && --depth === 0 && i < arg.length - 1) return null
  }
  return urls === 1 && value !== -1
    ? destination(argumentAt(arg, value, "}"))
    : null
}

/** Where an argument sends: a literal URL, a literal prefix, or `{ url }`. */
const destination = (arg: Token[]): string | null => {
  const [first, second] = arg
  if (!first) return null
  if (isPunct(first, "{")) return urlProperty(arg)
  if (first.kind !== "string" && first.kind !== "template") return null
  const whole = arg.length === 1
  // Only `+` keeps the literal's start as the URL's start.
  if (!whole && !(isPunct(second, "+") && onlyAppends(arg.slice(2))))
    return null
  return first.kind === "string"
    ? hostIn(first.value, whole)
    : hostIn(first.head, whole && !first.dynamic)
}

/** Reads where a script's network calls send. */
export const scriptSends = (script: string): ScriptSends => {
  const hosts = new Set<string>()
  let unknown = 0
  const note = (host: string | null) => {
    if (host) hosts.add(host)
    else unknown++
  }
  const walk = (tokens: Token[]) =>
    tokens.forEach((token, i) => {
      const next = tokens[i + 1]
      if (token.kind === "template") {
        if (CALL_LIKE.test(token.text)) unknown++
        token.inner.forEach(walk)
      } else if (token.kind === "string") {
        // `hopp["fetch"]`, `Reflect.get(pm, "sendRequest")`
        if (
          SENDS.has(token.value) ||
          OPAQUE.has(token.value) ||
          CALL_LIKE.test(token.value)
        )
          unknown++
      } else if (token.kind === "regex") {
        if (NAMES_SEND.test(token.value)) unknown++
      } else if (token.kind !== "name") {
        return
      } else if (SENDS.has(token.value)) {
        // `fetch(url)`, `fetch?.(url)`
        const args = isPunct(next, "(")
          ? i + 2
          : isPunct(next, "?.") && isPunct(tokens[i + 2], "(")
            ? i + 3
            : -1
        note(args === -1 ? null : destination(argumentAt(tokens, args)))
      } else if (OPAQUE.has(token.value)) {
        unknown++
      } else if (token.value === "import") {
        // `import "url"`, `import(url)`; `import x from` is read at `from`.
        if (isPunct(next, "(")) note(destination(argumentAt(tokens, i + 2)))
        else if (next?.kind === "string") note(hostIn(next.value, true))
      } else if (token.value === "from" && next?.kind === "string") {
        note(hostIn(next.value, true))
      } else if (GLOBALS.has(token.value) && isPunct(next, "[")) {
        const key = argumentAt(tokens, i + 2, "]")
        if (key.length !== 1 || key[0].kind !== "string") unknown++
      } else if (ROOTS.has(token.value) && !isProperty(tokens, i)) {
        // `const o = hopp` hands its sends on; `hopp.x` and `{ hopp: 1 }` don't.
        const member =
          (isPunct(next, ".") || isPunct(next, "?.")) &&
          tokens[i + 2]?.kind === "name"
        const key =
          isPunct(next, ":") &&
          (isPunct(tokens[i - 1], "{") || isPunct(tokens[i - 1], ","))
        if (!member && !key) unknown++
      }
    })
  walk(scan(script).tokens)
  return { hosts: [...hosts], unknown }
}
