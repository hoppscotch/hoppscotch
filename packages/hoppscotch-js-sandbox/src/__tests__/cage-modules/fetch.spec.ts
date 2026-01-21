import { describe, test, it, expect } from "vitest"
import { FaradayCage } from "faraday-cage"
import { defaultModules } from "~/cage-modules"
import type { HoppFetchHook } from "~/types"

const jsonBody = { foo: "bar", answer: 42 }
const jsonText = JSON.stringify(jsonBody)
const jsonBytes = Array.from(new TextEncoder().encode(jsonText))

const hookWithHeaders: HoppFetchHook = async () => {
  const resp = new Response(jsonText, {
    status: 200,
    headers: { "x-foo": "bar", "content-type": "application/json" },
  })
  return Object.assign(resp, {
    _bodyBytes: jsonBytes,
    _headersData: { "x-foo": "bar", "content-type": "application/json" },
  }) as Response
}

const hookNoHeaders: HoppFetchHook = async () => {
  const resp = new Response(jsonText, {
    status: 200,
    headers: { "x-missing": "not-copied" },
  })
  // Intentionally do NOT provide _headersData here; module should fallback to native Headers
  return Object.assign(resp, { _bodyBytes: jsonBytes }) as Response
}

const runCage = async (script: string, hook: HoppFetchHook) => {
  const cage = await FaradayCage.create()
  const result = await cage.runCode(script, [
    ...defaultModules({ hoppFetchHook: hook }),
  ])
  return result
}

describe("fetch cage module", () => {
  // ---------------------------------------------------------------------------
  // Global API availability (parity with faraday-cage conventions)
  // ---------------------------------------------------------------------------
  it("exposes fetch API globals in sandbox", async () => {
    const script = `
      (async () => {
        if (typeof fetch !== 'function') throw new Error('fetch not available')
        if (typeof Headers !== 'function') throw new Error('Headers not available')
        if (typeof Request !== 'function') throw new Error('Request not available')
        if (typeof Response !== 'function') throw new Error('Response not available')
        if (typeof AbortController !== 'function') throw new Error('AbortController not available')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  it("exposes essential properties on Response/Request/Headers", async () => {
    const script = `
      (async () => {
        const response = new Response()
        if (typeof response.status !== 'number') throw new Error('Response.status missing')
        if (typeof response.ok !== 'boolean') throw new Error('Response.ok missing')
        if (typeof response.json !== 'function') throw new Error('Response.json missing')
        if (typeof response.text !== 'function') throw new Error('Response.text missing')
        if (typeof response.clone !== 'function') throw new Error('Response.clone missing')

        const request = new Request('https://example.com')
        if (typeof request.url !== 'string') throw new Error('Request.url missing')
        if (typeof request.method !== 'string') throw new Error('Request.method missing')
        if (typeof request.clone !== 'function') throw new Error('Request.clone missing')

        const headers = new Headers()
        if (typeof headers.get !== 'function') throw new Error('Headers.get missing')
        if (typeof headers.set !== 'function') throw new Error('Headers.set missing')
        if (typeof headers.has !== 'function') throw new Error('Headers.has missing')

        const controller = new AbortController()
        if (typeof controller.signal !== 'object') throw new Error('AbortController.signal missing')
        if (typeof controller.abort !== 'function') throw new Error('AbortController.abort missing')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Fetch basics and options
  // ---------------------------------------------------------------------------
  it("basic fetch works and calls hook", async () => {
    let lastArgs: { input: string; init?: RequestInit } | null = null
    const capturingHook: HoppFetchHook = async (input, init) => {
      lastArgs = { input: String(input), init }
      return Object.assign(new Response(jsonText, { status: 200 }), {
        _bodyBytes: jsonBytes,
        _headersData: { "content-type": "application/json" },
      }) as Response
    }

    const script = `
      (async () => {
        const res = await fetch('https://example.com/api')
        if (!res.ok) throw new Error('fetch not ok')
      })()
    `
    const result = await runCage(script, capturingHook)
    expect(result.type).toBe("ok")
    expect(lastArgs?.input).toBe("https://example.com/api")
    expect(lastArgs?.init).toBeUndefined()
  })

  it("fetch with options passes through init", async () => {
    let lastArgs: { input: string; init?: RequestInit } | null = null
    const capturingHook: HoppFetchHook = async (input, init) => {
      lastArgs = { input: String(input), init }
      return Object.assign(new Response(jsonText, { status: 200 }), {
        _bodyBytes: jsonBytes,
        _headersData: { "content-type": "application/json" },
      }) as Response
    }

    const script = `
      (async () => {
        await fetch('https://example.com/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true })
        })
      })()
    `
    const result = await runCage(script, capturingHook)
    expect(result.type).toBe("ok")
    expect(lastArgs?.input).toBe("https://example.com/api")
    expect(lastArgs?.init?.method).toBe("POST")
    // Headers were converted to plain object inside cage for compatibility
    expect((lastArgs?.init as any)?.headers?.["Content-Type"]).toBe(
      "application/json"
    )
    expect(typeof lastArgs?.init?.body).toBe("string")
  })

  it("converts in-cage Headers instance in init to plain object for hook", async () => {
    let lastArgs: { input: string; init?: RequestInit } | null = null
    const capturingHook: HoppFetchHook = async (input, init) => {
      lastArgs = { input: String(input), init }
      return Object.assign(new Response(jsonText, { status: 200 }), {
        _bodyBytes: jsonBytes,
        _headersData: { "content-type": "application/json" },
      }) as Response
    }

    const script = `
      (async () => {
        const h = new Headers({ 'X-Token': 'secret' })
        await fetch('https://example.com/with-headers', { headers: h })
      })()
    `
    const result = await runCage(script, capturingHook)
    expect(result.type).toBe("ok")
    const hdrs = (lastArgs?.init as any)?.headers || {}
    expect(hdrs["X-Token"] ?? hdrs["x-token"]).toBe("secret")
  })

  test("json() parses and bodyUsed toggles; second consume throws", async () => {
    const script = `
      (async () => {
        const res = await fetch('https://example.test/json')
        if (res.ok !== true) throw new Error('ok not true')
        if (res.status !== 200) throw new Error('status mismatch')
        const data = await res.json()
        if (res.bodyUsed !== true) throw new Error('bodyUsed not true after json()')
        if (data.foo !== 'bar') throw new Error('json parse mismatch')
        let threw = false
        try { await res.text() } catch (_) { threw = true }
        if (!threw) throw new Error('second consume did not throw')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  test("headers with _headersData: get() and entries() work", async () => {
    const script = `
      (async () => {
        const res = await fetch('https://example.test/headers')
        const v = res.headers.get('x-foo')
        if (v !== 'bar') throw new Error('headers.get failed')
        const it = res.headers.entries()
        let found = false
        for (const pair of it) { if (pair[0] === 'x-foo' && pair[1] === 'bar') found = true }
        if (!found) throw new Error('headers.entries missing pair')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  test("headers fallback without _headersData uses native Headers", async () => {
    const script = `
      (async () => {
        const res = await fetch('https://example.test/no-headers')
        const v = res.headers.get('x-missing')
        if (v !== 'not-copied') throw new Error('fallback headers missing')
      })()
    `
    const result = await runCage(script, hookNoHeaders)
    expect(result.type).toBe("ok")
  })

  it("fallback builds _bodyBytes when hook returns native Response", async () => {
    const nativeHook: HoppFetchHook = async () =>
      new Response("Zed", {
        status: 200,
        headers: { "content-type": "text/plain" },
      })
    const script = `
      (async () => {
        const res = await fetch('https://example.test/native-body')
        const t = await res.text()
        if (t !== 'Zed') throw new Error('text mismatch after fallback _bodyBytes')
      })()
    `
    const result = await runCage(script, nativeHook)
    expect(result.type).toBe("ok")
  })

  test("AbortController abort() flips signal and invokes listener", async () => {
    const script = `
      (() => {
        const ac = new AbortController()
        let called = false
        ac.signal.addEventListener('abort', () => { called = true })
        if (ac.signal.aborted !== false) throw new Error('initial aborted not false')
        ac.abort()
        if (ac.signal.aborted !== true) throw new Error('aborted not true after abort()')
        if (called !== true) throw new Error('listener not called')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  test("clone(): original and clone can consume independently (flaky)", async () => {
    const script = `
      (async () => {
        const res = await fetch('https://example.test/clone')
        const clone = res.clone()
        await res.text()
        if (res.bodyUsed !== true) throw new Error('res.bodyUsed not true')
        await clone.text()
        if (clone.bodyUsed !== true) throw new Error('clone.bodyUsed not true')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Headers API surface (constructor-based)
  // ---------------------------------------------------------------------------
  it("Headers supports set/get/has/delete/append and case-insensitivity", async () => {
    const script = `
      (async () => {
        const headers = new Headers()
        headers.set('Content-Type', 'application/json')
        if (headers.get('content-type') !== 'application/json') throw new Error('case-insensitive get failed')
        if (!headers.has('Content-Type')) throw new Error('has failed')
        headers.append('X-Custom', 'v1')
        headers.append('X-Custom', 'v2')
        const x = headers.get('x-custom')
        if (!(x && x.includes('v1') && x.includes('v2'))) throw new Error('append combine failed')
        headers.delete('Content-Type')
        if (headers.has('Content-Type')) throw new Error('delete failed')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  it("Headers can initialize from object literal", async () => {
    const script = `
      (async () => {
        const headers = new Headers({ 'Content-Type': 'application/json', 'X-Custom': 'test' })
        if (headers.get('content-type') !== 'application/json') throw new Error('init object failed')
        if (headers.get('x-custom') !== 'test') throw new Error('init object custom failed')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Request constructor parity (subset)
  // ---------------------------------------------------------------------------
  it("Request constructs with url/method and options", async () => {
    const script = `
      (async () => {
        const r1 = new Request('https://example.com/api')
        if (r1.url !== 'https://example.com/api') throw new Error('Request.url mismatch')
        if (r1.method !== 'GET') throw new Error('Request default method mismatch')

        const r2 = new Request('https://example.com/api', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        if (r2.method !== 'POST') throw new Error('Request.method mismatch')
        // Our Request.headers is a plain object map
        if (!r2.headers || r2.headers['content-type'] !== 'application/json') throw new Error('Request.headers map mismatch')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  it("Request.clone() retains core properties", async () => {
    const script = `
      (async () => {
        const original = new Request('https://example.com/api', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        const clone = original.clone()
        if (clone.url !== original.url) throw new Error('clone url mismatch')
        if (clone.method !== original.method) throw new Error('clone method mismatch')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Response constructor parity (subset)
  // ---------------------------------------------------------------------------
  it("Response constructs with defaults and custom status", async () => {
    const script = `
      (async () => {
        const r1 = new Response()
        if (r1.status !== 200) throw new Error('Response default status mismatch')
        if (r1.ok !== true) throw new Error('Response default ok mismatch')

        const r2 = new Response('Not Found', { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'text/plain' } })
        if (r2.status !== 404) throw new Error('Response status mismatch')
        if (r2.ok !== false) throw new Error('Response ok mismatch')
        if (r2.statusText !== 'Not Found') throw new Error('Response statusText mismatch')
        // Our Response.headers is a plain map; verify via key
        if (!r2.headers || r2.headers['content-type'] !== 'text/plain') throw new Error('Response headers map mismatch')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  it("Response init supports type/url/redirected fields", async () => {
    const script = `
      (async () => {
        const r = new Response('x', { status: 200, type: 'default', url: 'https://e.x', redirected: true })
        if (r.type !== 'default') throw new Error('Response.type mismatch')
        if (r.url !== 'https://e.x') throw new Error('Response.url mismatch')
        if (r.redirected !== true) throw new Error('Response.redirected mismatch')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Body reading variants (adapted to our module semantics)
  // ---------------------------------------------------------------------------
  it("text(): reads body and sets bodyUsed", async () => {
    const textBytes = Array.from(new TextEncoder().encode("Hello World"))
    const hook: HoppFetchHook = async () =>
      Object.assign(new Response("Hello World", { status: 200 }), {
        _bodyBytes: textBytes,
        _headersData: { "content-type": "text/plain" },
      }) as Response
    const script = `
      (async () => {
        const res = await fetch('https://example.test/text')
        const t = await res.text()
        if (t !== 'Hello World') throw new Error('text mismatch')
        if (res.bodyUsed !== true) throw new Error('bodyUsed not true after text()')
      })()
    `
    const result = await runCage(script, hook)
    expect(result.type).toBe("ok")
  })

  it("arrayBuffer(): returns bytes array and sets bodyUsed", async () => {
    const bytes = [72, 101, 108, 108, 111]
    const hook: HoppFetchHook = async () =>
      Object.assign(new Response("", { status: 200 }), {
        _bodyBytes: bytes,
        _headersData: {},
      }) as Response
    const script = `
      (async () => {
        const res = await fetch('https://example.test/binary')
        const arr = await res.arrayBuffer() // In our module, this returns an array of numbers
        if (!Array.isArray(arr)) throw new Error('arrayBuffer did not return array')
        if (arr.length !== 5 || arr[0] !== 72 || arr[1] !== 101 || arr[2] !== 108 || arr[3] !== 108 || arr[4] !== 111) throw new Error('byte content mismatch')
        if (res.bodyUsed !== true) throw new Error('bodyUsed not true after arrayBuffer()')
      })()
    `
    const result = await runCage(script, hook)
    expect(result.type).toBe("ok")
  })

  it("blob(): returns minimal blob-like and sets bodyUsed", async () => {
    const bytes = [1, 2, 3]
    const hook: HoppFetchHook = async () =>
      Object.assign(new Response("", { status: 200 }), {
        _bodyBytes: bytes,
        _headersData: {},
      }) as Response
    const script = `
      (async () => {
        const res = await fetch('https://example.test/blob')
        const b = await res.blob()
        if (typeof b !== 'object' || typeof b.size !== 'number' || !Array.isArray(b.bytes)) throw new Error('blob shape mismatch')
        if (b.size !== 3) throw new Error('blob size mismatch')
        if (res.bodyUsed !== true) throw new Error('bodyUsed not true after blob()')
      })()
    `
    const result = await runCage(script, hook)
    expect(result.type).toBe("ok")
  })

  it("formData(): parses simple urlencoded text and sets bodyUsed", async () => {
    const text = "name=Test%20User&id=123"
    const bytes = Array.from(new TextEncoder().encode(text))
    const hook: HoppFetchHook = async () =>
      Object.assign(new Response("", { status: 200 }), {
        _bodyBytes: bytes,
        _headersData: {},
      }) as Response
    const script = `
      (async () => {
        const res = await fetch('https://example.test/form')
        const fd = await res.formData()
        if (fd.name !== 'Test User') throw new Error('form name mismatch')
        if (fd.id !== '123') throw new Error('form id mismatch')
        if (res.bodyUsed !== true) throw new Error('bodyUsed not true after formData()')
      })()
    `
    const result = await runCage(script, hook)
    expect(result.type).toBe("ok")
  })

  it("text() trims at first null byte (cleaning trailing bytes)", async () => {
    const bytes = [65, 66, 0, 67] // 'A','B','\0','C' => expect 'AB'
    const hook: HoppFetchHook = async () =>
      Object.assign(new Response("", { status: 200 }), {
        _bodyBytes: bytes,
        _headersData: { "content-type": "text/plain" },
      }) as Response
    const script = `
      (async () => {
        const res = await fetch('https://example.test/null-bytes')
        const t = await res.text()
        if (t !== 'AB') throw new Error('null-byte trimming failed: ' + t)
      })()
    `
    const result = await runCage(script, hook)
    expect(result.type).toBe("ok")
  })

  it("enforces single body consumption across methods", async () => {
    const textBytes = Array.from(new TextEncoder().encode("Hello"))
    const hook: HoppFetchHook = async () =>
      Object.assign(new Response("Hello", { status: 200 }), {
        _bodyBytes: textBytes,
        _headersData: {},
      }) as Response
    const script = `
      (async () => {
        const res = await fetch('https://example.test/consume-once')
        await res.text()
        let ok = false
        try { await res.json() } catch (e) { if (String(e.message).includes('already been consumed')) ok = true }
        if (!ok) throw new Error('second consume should have failed')
      })()
    `
    const result = await runCage(script, hook)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // AbortController integration with fetch (module-adapted)
  // ---------------------------------------------------------------------------
  it("fetch with aborted signal rejects (message-based)", async () => {
    const abortAwareHook: HoppFetchHook = async (_input, init) => {
      if ((init as any)?.signal?.aborted) {
        throw new Error("The operation was aborted.")
      }
      return Object.assign(new Response(jsonText, { status: 200 }), {
        _bodyBytes: jsonBytes,
        _headersData: { "content-type": "application/json" },
      }) as Response
    }
    const script = `
      (async () => {
        const ac = new AbortController()
        ac.abort()
        let rejected = false
        try {
          await fetch('https://example.test/abort', { signal: ac.signal })
        } catch (err) {
          if (!String(err.message).toLowerCase().includes('aborted')) throw new Error('expected abort message')
          rejected = true
        }
        if (!rejected) throw new Error('fetch should reject when aborted')
      })()
    `
    const result = await runCage(script, abortAwareHook)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Error handling (module-adapted)
  // ---------------------------------------------------------------------------
  it("network errors propagate as FetchError with message", async () => {
    const failingHook: HoppFetchHook = async () => {
      throw new Error("Network failure")
    }
    const script = `
      (async () => {
        let passed = false
        try {
          await fetch('https://example.test/error')
        } catch (e) {
          if (!String(e.message).includes('Network failure')) throw new Error('unexpected error message: ' + e.message)
          passed = true
        }
        if (!passed) throw new Error('expected rejection')
      })()
    `
    const result = await runCage(script, failingHook)
    expect(result.type).toBe("ok")
  })

  it("network errors surface as FetchError by name in-cage", async () => {
    const failingHook: HoppFetchHook = async () => {
      throw new Error("Bad things")
    }
    const script = `
      (async () => {
        let passed = false
        try {
          await fetch('https://example.test/error2')
        } catch (e) {
          if (e.name !== 'FetchError') throw new Error('expected FetchError name, got: ' + e.name)
          passed = true
        }
        if (!passed) throw new Error('expected rejection')
      })()
    `
    const result = await runCage(script, failingHook)
    expect(result.type).toBe("ok")
  })

  // ---------------------------------------------------------------------------
  // Headers iteration helpers
  // ---------------------------------------------------------------------------
  it("Headers keys/values/forEach expose entries", async () => {
    const script = `
      (async () => {
        const h = new Headers({ A: '1', B: '2' })
        const keys = h.keys()
        const values = h.values()
        let count = 0
        h.forEach((_v, _k) => { count++ })
        if (!Array.isArray(keys) || !Array.isArray(values)) throw new Error('keys/values shape')
        if (count < 2) throw new Error('forEach did not iterate')
      })()
    `
    const result = await runCage(script, hookWithHeaders)
    expect(result.type).toBe("ok")
  })
})
