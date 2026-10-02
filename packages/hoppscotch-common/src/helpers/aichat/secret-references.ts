const LOCAL_SECRET_REFERENCE = /^<<local-ref:([A-Za-z0-9_-]+)>>$/
/** Every `<<local-ref:id>>` occurrence inside a longer string. */
export const LOCAL_SECRET_REFERENCE_GLOBAL = /<<local-ref:([A-Za-z0-9_-]+)>>/g

export const REDACTED_VALUE = "[REDACTED]"

// Every rule below mirrors the backend sanitizer in ai-experiments.service.ts
// byte-for-byte; its spec checks they match.
/**
 * Values that may stay visible: environment placeholders (<<name>>, <<$fn>>)
 * and existing client-local references (<<local-ref:id>>) — both are opaque
 * to the model.
 */
const SAFE_TEMPLATE =
  /<<(?:local-ref:[A-Za-z0-9_-]+|\$?[A-Za-z][A-Za-z0-9_.-]*|_[A-Za-z0-9_.-]*)>>/g
const SENSITIVE_TEMPLATE = /<<(?:sk_|rk_|whsec_|sk-ant-)/i
/** An `Authorization` scheme word, which is not itself a secret. */
const AUTH_SCHEME =
  /^`?(?:Bearer|Basic|Token|Digest|Negotiate|NTLM|OAuth|ApiKey|SSWS|Bot|SharedKey|Signature|AWS4-HMAC-SHA256)(?![\w-])[ \t]*/i
/** A value meaning the keyword is a field name (`"secret": true`, `"token": [1`). */
const STRUCTURAL_LITERAL =
  /^(?:true|false|null|undefined|[[{]+(?:-?\d+(?:\.\d+)?|true|false|null)?[\]}]*)$/
/** GraphQL built-in scalars (`password: String!`); other SDL sits in a GRAPHQL_BLOCK. */
const TYPE_REFERENCE = /^\[?(?:String|Int|Float|Boolean|ID)!?\]?!?$/
/** References, not values: `pw.env.get(…)`, `await …`, `getToken()`, `$API_KEY`, `{{token}}`, `${TOKEN}`. */
const VALUE_REFERENCE =
  /^(?:(?:pw|hopp|pm|request|response|env|JSON|Math|Date|crypto|this|btoa|atob|encodeURIComponent)(?:\??\.|\[|\().*|await|new|typeof|function|async|void|yield|[a-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\([^()\s]*\)[;)]*|\$\{?_?[A-Z]+(?:_[A-Z0-9]*)*\}?|\{\{[ \t]*[A-Za-z_][\w.-]*(?:[ \t]*\}\})?|\$\{[A-Za-z_][\w.-]*\}?)$/
/** Expressions (`a.b`, `f(`, `await f()`), references only where the key is code. */
const JS_REFERENCE =
  /^(?!.*\beyJ)(?:(?:await|new|typeof|void|yield)\s.*|[A-Za-z_$][\w$]*(?:(?:\??\.[A-Za-z_$][\w$]*)+(?:[([].*)?|[([].*))$/
/** Text before a key that makes it code: `const token =`, `{ token:`. */
const DECLARATION = /(?:^|[^\w$.])(?:const|let|var)[ \t]+[\w$]*$/
const OBJECT_KEY = /[{,][ \t\r\n]*["']?[\w$-]*$/
/** A path or ARN segment (`/secrets/db_password:addVersion`), not a key. */
const PATH_SEGMENT = /[:/][\w.-]*$/
/** Keys that also name ids, tickers, statuses and prose (`"session": "active"`). */
const BROAD_KEY = /^(?:token|session)/i
const BROAD_VALUE =
  /^(?:[a-z]{1,12}|[A-Z]{2,5}|(?![Bb]earer |[Bb]asic |[Tt]oken )[A-Za-z][a-z]{0,15}(?:[ \t]+[a-z]{1,15})+[.!?]?)$/
const NUMBER = /^-?\d+(?:\.\d+)?$/
/** Bare `pass`, `pwd`, `sig` and `key` also name counts, directories and fields. */
const WEAK_KEY = /^(?:(pass)|(pwd)|sig(?:nature)?|key)(?!\w)/i
const PATH_VALUE = /^~?\/[\w./-]*$/
const NAME_VALUE =
  /^(?=.{1,32}$)(?:[a-z]+\d*(?:[-_.][a-z]+\d*)*|[A-Z][a-z]*(?:-[A-Z][a-z]*)*)$/
/** A YAML `|`/`>` indicator up to its first content line. */
const BLOCK_SCALAR = /^[|>][-+]?[0-9]?[ \t]*\r?\n[ \t]+/
/**
 * The head of a GraphQL operation or type definition, up to its `{`. Bare
 * values inside are variables, enums, aliases or types: literals are quoted.
 */
const GRAPHQL_BLOCK =
  /(?:\b(?:query|mutation|subscription)(?:[ \t]{1,8}\w+)?[ \t]{0,8}(?:\([^()]{0,300}\))?|\bfragment[ \t]{1,8}\w+[ \t]{1,8}on[ \t]{1,8}\w+|\b(?:type|input|interface)[ \t]{1,8}\w+(?:[ \t]{1,8}implements[ \t]{1,8}[\w& \t]{1,80})?|(?:^|[\n"])(?=\{[ \t\r\n]{0,16}\w+[ \t\r\n]{0,16}[{(]))[ \t\r\n]{0,16}\{/g

/** Credential key names. `token` skips pagination and idempotency keys. */
const SECRET_KEY = `(?:api[-_]?key|private[-_]?key|subscription[-_]?key|(?:account|shared[-_]?access|encryption|signing|master|app|functions|access)[-_]?key|secret(?:[-_]?(?:access[-_]?)?key)?|passw(?:or)?d|(?<![A-Za-z])(?:pass(?:phrase)?|pwd|sig(?:nature)?)|sessid|(?<!(?:page|next|prev|previous|continuation|sync|client|sell|buy|resume|cursor|delta|idempotency)[-_]?)token|session(?:[-_]?id)?|(?<=[?&]|(?:^|[\\r\\n])[ \\t]{0,8}-[ \\t]{1,8})key)`
// Whitespace runs are bounded on purpose: an unbounded `\s*["']?\s*` pair
// backtracks quadratically on a keyword followed by a long whitespace run.
const KEY_SEP = `[ \\t]{0,8}\\\\?["']?[ \\t]{0,8}(?::(?!:)|=(?![=>]))[ \\t]{0,8}\\\\?["']?`

/** PEM private keys, armor headers included, also JSON-escaped or cut off. */
const PRIVATE_KEY_BLOCK =
  /-----BEGIN [A-Z ]{0,40}PRIVATE KEY[A-Z ]{0,10}-----(?:(?<=[\r\n]|\\n)[A-Za-z][\w-]{0,30}:[^\r\n\\]{0,200}|[A-Za-z0-9+/=\s]|\\[nr])*(?:-----END [A-Z ]{0,40}PRIVATE KEY[A-Z ]{0,10}-----)?/g
/** The password in `scheme://user:password@host`; a `<<ref>>` user stays whole. */
const URL_PASSWORD =
  /(\/\/(?:<<[\w$.:-]{1,120}>>|(?!<<)[^\s/?#@:])*:)([^\s/?#@]+)(?=@)/g
/** curl/httpie credentials: `-u user:pass`, `--oauth2-bearer t`, `-b k=v`; refs stay whole. */
const CLI_CREDENTIAL =
  /((?:^|[\s(])(?:(?:-u|--user|-a|--auth|--proxy-user)[ \t=]{1,8}["']?(?:<<[\w$.:-]{1,120}>>|(?!<<)[^\s"':]){0,200}:|--oauth2-bearer[ \t=]{1,8}["']?|(?:-b|--cookie)[ \t=]{1,8}["']?(?=[^\s"']{0,200}=)|CURLOPT_USERPWD[ \t]*,[ \t]*["'](?:<<[\w$.:-]{1,120}>>|(?!<<)[^\s"':]){0,200}:))([^\s"']+)/g
/**
 * `Authorization: <scheme> <credential>` — the scheme stays, the credential
 * goes: one token, or a `k=v, k="v"` list (Digest, AWS4, `Token token="…"`).
 */
const AUTH_HEADER_ASSIGNMENT = new RegExp(
  `((?:authorization|proxy-authorization)${KEY_SEP})(?:((?:AWS4-HMAC-SHA256|[A-Za-z][A-Za-z-]{0,15})[ \\t]+)((?:[\\w-]+=(?:\\\\?["'][^"'\\r\\n]*["']|[^\\s,"'}\\\\]*)(?:[ \\t]*,[ \\t]*)?)+|[^\\s,}"'\\\\]+)|([^\\s,}"']+))`,
  "gi"
)
/** Cookie headers carry several `k=v` pairs — treat the whole value as one secret. */
const COOKIE_ASSIGNMENT = new RegExp(
  `((?:cookie|set-cookie)${KEY_SEP})(\\[[^\\]]{0,4000}|[^\\r\\n"'}]+)`,
  "gi"
)
/** One quoted cookie in a `"set-cookie": [...]` array. */
const COOKIE_ITEM = /"([^"\\\r\n]*)"|'([^'\\\r\n]*)'/g
/** A quoted credential name whose value is a separate field or argument. */
const PAIR_NAME = `["'][^"'\\r\\n]{0,80}?(?:${SECRET_KEY}|(?:proxy-)?authorization|(?:set-)?cookie)["']`
/** `set("api_key", "…")`, `'password' => '…'`, `{"key": "Authorization", "value": "…"}`. */
const NAMED_VALUE = new RegExp(
  `((?:\\([ \\t]*${PAIR_NAME}[ \\t]*,[ \\t]*|${PAIR_NAME}[ \\t]*=>[ \\t]*|["'](?:key|name)["'][ \\t]*:[ \\t]*${PAIR_NAME}[^{}[\\]]{0,160}?["']value["'][ \\t]*:[ \\t]*)["'])((?:[^"'\\\\\\r\\n]|\\\\.)+)`,
  "gi"
)
/**
 * Credential assignments (`x-auth-token: …`, `"password": "…"`), never `==`
 * or `=>`. A quoted value (also `\"…\"` in stringified JSON) runs to its
 * closing quote or the line end; a `- key: value` line, or a line-start
 * `key: value` with no other `:`/`=`, to its end (YAML block scalars too);
 * a bare `:` value past `&`, and a bare `=` value (a query param) up to it.
 */
const SENSITIVE_ASSIGNMENT = new RegExp(
  `(${SECRET_KEY}[ \\t]{0,8}\\\\?["']?[ \\t]{0,8}(?::(?!:)=?|=(?![=>]))[ \\t]{0,8})(?:\\\\"((?:[^"\\\\\\r\\n]|\\\\\\\\)+)(?:\\\\")?|"((?:[^"\\\\\\r\\n]|\\\\.?)+)"?|'((?:[^'\\\\\\r\\n]|\\\\.?)+)'?|(?<=(?:^|[\\r\\n])[ \\t]{0,8}-[ \\t]{1,8}[\\w.-]{1,120}[ \\t]{0,8}:[ \\t]{0,8})(\\S[^\\r\\n]*)|(?<=(?:^|[\\r\\n])[ \\t]{0,8}[\\w.-]{1,120}[ \\t]{0,8}[:=][ \\t]{0,8})([|>][-+]?[0-9]?(?:[ \\t]*\\r?\\n[ \\t]+\\S[^\\r\\n]*)+|\\S[^\\r\\n:=]*(?![^\\r\\n]))|((?<=:[ \\t]{0,8})[^,\\s}"']+|[^,\\s}"'&;]+))`,
  "gi"
)
/**
 * Bare credentials with a recognizable shape, wherever they appear. A JWT may
 * only start a `[A-Za-z0-9_-]` run: restarting inside one made the scan quadratic.
 */
const STANDALONE_SECRET =
  /\b(?:sk-ant-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,}|sk_(?:test|live)_[A-Za-z0-9]+|rk_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|(?:AKIA|ASIA)[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|xapp-\d-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|SG\.[\w-]{16,}\.[\w-]{16,}|GOCSPX-[\w-]{20,}|hf_[A-Za-z0-9]{30,}|npm_[A-Za-z0-9]{36})|(?<=hooks\.slack\.com\/services\/|discord(?:app)?\.com\/api\/webhooks\/)[\w/-]{20,}|(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g

/** Placeholders only (a scheme word may lead): `<<token>>`, `Bearer <<t>>`. */
const isSafeValue = (value: string) => {
  if (value === REDACTED_VALUE) return true
  const rest = value.replace(AUTH_SCHEME, "")
  const left = rest.replace(SAFE_TEMPLATE, "")
  return (
    left.length < rest.length &&
    !/[A-Za-z0-9]/.test(left) &&
    !SENSITIVE_TEMPLATE.test(rest)
  )
}

/** A cookie whose every value is a placeholder (`session=<<sid>>`). */
const isSafeCookie = (value: string) =>
  value.split(";").every((part) => {
    const cookie = part.slice(part.indexOf("=") + 1).trim()
    return !cookie || isSafeValue(cookie)
  })

/** Length without a trailing `\` (the escape of a closing `\"`). */
const unescapedLength = (value: string) =>
  value.endsWith("\\") ? value.length - 1 : value.length

/** A bare value that is syntax or a reference rather than a credential. */
const isPlainValue = (value: string, numeric: boolean) =>
  isSafeValue(value) ||
  STRUCTURAL_LITERAL.test(value) ||
  TYPE_REFERENCE.test(value) ||
  VALUE_REFERENCE.test(value) ||
  (numeric && NUMBER.test(value))

/** `"pass": 3`, `PWD=/app`, `?sig=v1`, `- key: Accept`; `DB_PASS=` never. */
const isWeakValue = (prefix: string, lead: string, value: string) => {
  const weak = lead.endsWith("_") ? null : WEAK_KEY.exec(prefix)
  if (!weak) return false
  return (weak[1] ? NUMBER : weak[2] ? PATH_VALUE : NAME_VALUE).test(value)
}

/**
 * [start, end) of each GraphQL block, closed by its matching `}`. A head
 * left open (prose, a truncated body) exempts nothing, and braces never
 * pair across a `### ` context section.
 */
const graphQLBlocks = (content: string): Array<[number, number]> => {
  const closers = new Map<number, number>()
  const open: number[] = []
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === "{") open.push(i)
    else if (char === "}") {
      const at = open.pop()
      if (at !== undefined) closers.set(at, i + 1)
    } else if (char === "\n" && content.startsWith("### ", i + 1)) {
      open.length = 0
    }
  }
  const blocks: Array<[number, number]> = []
  GRAPHQL_BLOCK.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = GRAPHQL_BLOCK.exec(content))) {
    const end = closers.get(match.index + match[0].length - 1)
    if (end === undefined) continue
    blocks.push([match.index, end])
    GRAPHQL_BLOCK.lastIndex = end
  }
  return blocks
}

export const makeLocalSecretReference = (id: string): string =>
  `<<local-ref:${id}>>`

export const getLocalSecretReferenceID = (value: string): string | null =>
  value.match(LOCAL_SECRET_REFERENCE)?.[1] ?? null

/** True when the string contains a `<<local-ref:id>>` anywhere. */
export const containsLocalSecretReference = (value: string): boolean => {
  LOCAL_SECRET_REFERENCE_GLOBAL.lastIndex = 0
  return LOCAL_SECRET_REFERENCE_GLOBAL.test(value)
}

/**
 * Rewrites every credential in `content` through `onSecret` (which returns
 * the replacement text). Values that are already opaque to the model —
 * environment placeholders and local references — are left untouched, as are
 * field-name literals, SDL types, GraphQL syntax and script references.
 * `firstWord`: a ref must hold exactly the credential, so an unquoted
 * line-start or `- key:` value ends at its first space and the prose after
 * it stays.
 */
const rewriteSensitiveValues = (
  content: string,
  onSecret: (secret: string) => string,
  firstWord = false
): string => {
  const text = content
    .replace(PRIVATE_KEY_BLOCK, (secret: string) => onSecret(secret.trim()))
    .replace(URL_PASSWORD, (match, prefix: string, secret: string) =>
      isSafeValue(secret) ? match : `${prefix}${onSecret(secret)}`
    )
    .replace(CLI_CREDENTIAL, (match, prefix: string, secret: string) =>
      isSafeValue(secret) ||
      VALUE_REFERENCE.test(secret) ||
      // `-b "sid=<<sid>>"`: a cookie of placeholders.
      (/^[\s(]?(?:-b|--cookie)[ \t=]/.test(prefix) &&
        secret.includes("<<") &&
        isSafeCookie(secret))
        ? match
        : `${prefix}${onSecret(secret)}`
    )
    .replace(
      AUTH_HEADER_ASSIGNMENT,
      (
        match,
        prefix: string,
        scheme: string | undefined,
        credential: string | undefined,
        bare: string | undefined
      ) => {
        const value = credential ?? bare ?? ""
        const trimmed = value.replace(/[\s,]+$/, "")
        const secret = trimmed.slice(0, unescapedLength(trimmed))
        return isSafeValue(secret) ||
          VALUE_REFERENCE.test(secret) ||
          (!scheme && !secret.replace(AUTH_SCHEME, ""))
          ? match
          : `${prefix}${scheme ?? ""}${onSecret(secret)}${value.slice(secret.length)}`
      }
    )
    .replace(COOKIE_ASSIGNMENT, (match, prefix: string, value: string) => {
      if (value.startsWith("[")) {
        return `${prefix}${value.replace(
          COOKIE_ITEM,
          (item, double: string | undefined, single: string | undefined) => {
            const cookie = double ?? single ?? ""
            return isSafeCookie(cookie)
              ? item
              : `${item[0]}${onSecret(cookie)}${item[0]}`
          }
        )}`
      }
      const trimmed = value.trimEnd()
      const secret = trimmed.slice(0, unescapedLength(trimmed))
      // `"cookie": {…}` is a settings object, not a header.
      return !secret || secret.startsWith("{") || isSafeCookie(secret)
        ? match
        : `${prefix}${onSecret(secret)}${value.slice(secret.length)}`
    })
    .replace(NAMED_VALUE, (match, prefix: string, secret: string) => {
      const scheme = AUTH_SCHEME.exec(secret)?.[0] ?? ""
      return scheme === secret ||
        isSafeValue(secret) ||
        VALUE_REFERENCE.test(secret)
        ? match
        : `${prefix}${scheme}${onSecret(secret.slice(scheme.length))}`
    })

  // Matches arrive in order, so one cursor walks the blocks.
  const blocks = graphQLBlocks(text)
  let block = 0
  const inGraphQL = (offset: number) => {
    while (block < blocks.length && blocks[block][1] <= offset) block++
    return block < blocks.length && blocks[block][0] <= offset
  }

  return text
    .replace(
      SENSITIVE_ASSIGNMENT,
      (
        match,
        prefix: string,
        escaped: string | undefined,
        doubleQuoted: string | undefined,
        singleQuoted: string | undefined,
        entry: string | undefined,
        line: string | undefined,
        bare: string | undefined,
        offset: number,
        whole: string
      ) => {
        const lead = whole.slice(Math.max(0, offset - 64), offset)
        if (!prefix.includes("=") && PATH_SEGMENT.test(lead)) return match
        const broad = BROAD_KEY.test(prefix)
        const quoted = escaped ?? doubleQuoted ?? singleQuoted
        if (quoted !== undefined) {
          // Quoted values are data: only placeholders and plain words stay.
          if (
            isSafeValue(quoted) ||
            (broad && BROAD_VALUE.test(quoted)) ||
            isWeakValue(prefix, lead, quoted)
          ) {
            return match
          }
          const start = prefix.length + (escaped === undefined ? 1 : 2)
          return `${match.slice(0, start)}${onSecret(quoted)}${match.slice(start + quoted.length)}`
        }
        // A YAML block scalar: its indicator stays, its lines are the value.
        const scalar = line && BLOCK_SCALAR.exec(line)?.[0]
        if (scalar) {
          const content = line.slice(scalar.length).trimEnd()
          return isSafeValue(content)
            ? match
            : `${prefix}${scalar}${onSecret(content)}${line.slice(scalar.length + content.length)}`
        }
        const full = entry ?? line ?? bare ?? ""
        // A scheme word stays with the credential after it.
        const cut = firstWord && bare === undefined
        const scheme = cut ? (AUTH_SCHEME.exec(full)?.[0] ?? "") : ""
        const value = cut
          ? `${scheme}${full.slice(scheme.length).split(/\s/, 1)[0]}`
          : full
        // A trailing `;`, or a `)` opened before the value, ends a call or
        // statement; `getToken()` keeps its own.
        let end = value.trimEnd().length
        let open =
          (value.match(/\(/g) ?? []).length - (value.match(/\)/g) ?? []).length
        while (bare !== undefined && end) {
          const char = value[end - 1]
          if (char === ")" && open < 0) open++
          else if (char !== ";") break
          end--
        }
        const secret = value.slice(0, end)
        const core = bare === undefined ? secret.replace(/[;,]$/, "") : secret
        // `x = a.b;` is a statement; `Password=a.b;` a connection string.
        const statement =
          /[ \t]$/.test(prefix) &&
          /^\)*[;,]/.test(
            `${full.slice(core.length)}${whole[offset + match.length] ?? ""}`
          )
        const code =
          statement || DECLARATION.test(lead) || OBJECT_KEY.test(lead)
        const key = `${/[\w$-]*$/.exec(lead)?.[0] ?? ""}${/^[\w$-]*/.exec(prefix)?.[0] ?? ""}`
        const plain = (numeric: boolean) =>
          isPlainValue(core, numeric) ||
          (broad && BROAD_VALUE.test(core)) ||
          isWeakValue(prefix, lead, core) ||
          (code && (JS_REFERENCE.test(core) || core === key))
        const kept =
          !core ||
          (entry !== undefined
            ? plain(false)
            : inGraphQL(offset) || plain(broad))
        return kept
          ? match
          : `${prefix}${onSecret(core)}${full.slice(core.length)}`
      }
    )
    .replace(STANDALONE_SECRET, (secret: string) => onSecret(secret))
}

/** Removes credentials from context that has no need to retain their values. */
export const redactSensitiveChatValues = (content: string): string =>
  rewriteSensitiveValues(content, () => REDACTED_VALUE)

/**
 * Replaces user-supplied credentials with opaque, client-local references before
 * the message reaches the model. The caller owns the reference-to-value map.
 */
export const replaceSensitiveChatValues = (
  content: string,
  createReference: (secret: string) => string
): string =>
  rewriteSensitiveValues(
    content,
    (secret) => makeLocalSecretReference(createReference(secret)),
    true
  )
