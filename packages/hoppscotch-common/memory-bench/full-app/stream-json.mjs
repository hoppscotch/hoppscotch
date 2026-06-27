/**
 * Streaming JSON parser for files that exceed V8's max string length.
 *
 * `JSON.parse(readFileSync(path, "utf8"))` first materialises the whole file as
 * a single JS string. A multi-hundred-MB heap snapshot blows past V8's
 * ~512 MB string cap (throwing "Invalid string length") and, even below it,
 * doubles peak memory by holding the source string and the parsed value at
 * once. This parser consumes the file as a byte stream and builds the value
 * incrementally — the only thing kept in memory is the parsed result itself,
 * and no single intermediate string is ever larger than one JSON token.
 *
 * Tokens (strings, numbers, literals) may straddle chunk boundaries, so each
 * chunk is appended to a small carry buffer and only fully-formed tokens are
 * consumed; the unconsumed tail carries into the next chunk.
 */
import { createReadStream } from "node:fs"
import { StringDecoder } from "node:string_decoder"

// Parse states.
const VALUE = 0 // expecting a value (or array close)
const KEY = 1 // expecting an object key (or object close)
const COLON = 2 // expecting ':' after a key
const AFTER = 3 // expecting ',' or a container close after a value

const WS = new Set([" ", "\t", "\n", "\r"])
const isDigit = (c) => c >= "0" && c <= "9"

export function parseJSONFile(path, streamOpts) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder("utf8")
    let buf = "" // unconsumed text carried across chunks
    let state = VALUE
    const stack = [] // containers being built (arrays/objects)
    const keys = [] // pending key per object on the stack
    let root // completed top-level value
    let done = false

    // Attach a finished value to its parent container (or record it as root).
    const emit = (v) => {
      if (stack.length === 0) {
        root = v
        done = true
        return
      }
      const top = stack[stack.length - 1]
      if (Array.isArray(top)) top.push(v)
      else top[keys[keys.length - 1]] = v
      state = AFTER
    }

    const openContainer = (v) => {
      const isKeyNext = !Array.isArray(v)
      if (stack.length === 0) {
        // root container
      } else {
        const top = stack[stack.length - 1]
        if (Array.isArray(top)) top.push(v)
        else top[keys[keys.length - 1]] = v
      }
      stack.push(v)
      if (!Array.isArray(v)) keys.push(undefined)
      state = isKeyNext ? KEY : VALUE
    }

    const closeContainer = () => {
      const v = stack.pop()
      if (!Array.isArray(v)) keys.pop()
      if (stack.length === 0) {
        root = v
        done = true
      } else {
        state = AFTER
      }
    }

    // Consume as many complete tokens as possible from `buf`. Returns the
    // number of leading characters consumed; the remainder is kept for the
    // next chunk (it may be a partial token).
    const consume = (s, atEnd) => {
      let i = 0
      const n = s.length
      while (i < n) {
        const c = s[i]
        if (WS.has(c)) {
          i++
          continue
        }
        if (state === AFTER) {
          if (c === ",") {
            const top = stack[stack.length - 1]
            state = Array.isArray(top) ? VALUE : KEY
            i++
          } else if (c === "]" || c === "}") {
            closeContainer()
            i++
          } else {
            throw new SyntaxError(`Unexpected '${c}' after value`)
          }
          continue
        }
        if (state === COLON) {
          if (c !== ":") throw new SyntaxError(`Expected ':', got '${c}'`)
          state = VALUE
          i++
          continue
        }
        if (state === KEY) {
          if (c === "}") {
            closeContainer()
            i++
            continue
          }
          if (c !== '"') throw new SyntaxError(`Expected object key, got '${c}'`)
          const r = readString(s, i, atEnd)
          if (r === null) break // incomplete — wait for more input
          keys[keys.length - 1] = r.value
          state = COLON
          i = r.next
          continue
        }
        // state === VALUE
        if (c === "]") {
          // empty array close
          closeContainer()
          i++
          continue
        }
        if (c === "{") {
          openContainer({})
          i++
          continue
        }
        if (c === "[") {
          openContainer([])
          i++
          continue
        }
        if (c === '"') {
          const r = readString(s, i, atEnd)
          if (r === null) break
          emit(r.value)
          i = r.next
          continue
        }
        if (c === "-" || isDigit(c)) {
          const r = readNumber(s, i, atEnd)
          if (r === null) break
          emit(r.value)
          i = r.next
          continue
        }
        // literals: true / false / null
        const r = readLiteral(s, i, atEnd)
        if (r === null) break
        emit(r.value)
        i = r.next
      }
      return i
    }

    const onData = (chunk, atEnd) => {
      buf += chunk
      const used = consume(buf, atEnd)
      buf = used ? buf.slice(used) : buf
    }

    const stream = createReadStream(path, streamOpts)
    stream.on("data", (chunk) => {
      try {
        onData(decoder.write(chunk), false)
      } catch (e) {
        stream.destroy()
        reject(e)
      }
    })
    stream.on("end", () => {
      try {
        onData(decoder.end(), true)
        if (!done) throw new SyntaxError("Unexpected end of JSON input")
        resolve(root)
      } catch (e) {
        reject(e)
      }
    })
    stream.on("error", reject)
  })
}

// Read a JSON string starting at the opening quote `s[i]`. Returns
// { value, next } or null if the string is not yet complete in `s`.
function readString(s, i, atEnd) {
  let j = i + 1
  let out = ""
  const n = s.length
  while (j < n) {
    const c = s[j]
    if (c === '"') return { value: out, next: j + 1 }
    if (c === "\\") {
      if (j + 1 >= n) break // escape split across chunk
      const e = s[j + 1]
      if (e === "u") {
        if (j + 6 > n) break // \uXXXX split across chunk
        out += String.fromCharCode(parseInt(s.slice(j + 2, j + 6), 16))
        j += 6
        continue
      }
      out +=
        e === "n" ? "\n" :
        e === "t" ? "\t" :
        e === "r" ? "\r" :
        e === "b" ? "\b" :
        e === "f" ? "\f" :
        e // " \ / and anything else map to themselves
      j += 2
      continue
    }
    out += c
    j++
  }
  if (atEnd) throw new SyntaxError("Unterminated string")
  return null
}

// Read a number starting at `s[i]`. A number is only known to be complete when
// followed by a non-number character, so an unterminated run at the true end of
// input would be ambiguous — but valid JSON always has a closing token after a
// top-level/structural number, so `atEnd` with a trailing number is finalised.
function readNumber(s, i, atEnd) {
  let j = i
  const n = s.length
  while (j < n) {
    const c = s[j]
    if (isDigit(c) || c === "-" || c === "+" || c === "." || c === "e" || c === "E") j++
    else break
  }
  if (j === n && !atEnd) return null // may continue in next chunk
  return { value: Number(s.slice(i, j)), next: j }
}

const LITERALS = { true: true, false: false, null: null }
function readLiteral(s, i, atEnd) {
  for (const [word, value] of Object.entries(LITERALS)) {
    if (s.startsWith(word, i)) return { value, next: i + word.length }
    // Possible partial literal at the chunk tail.
    if (!atEnd && word.startsWith(s.slice(i))) return null
  }
  throw new SyntaxError(`Unexpected token '${s[i]}'`)
}
