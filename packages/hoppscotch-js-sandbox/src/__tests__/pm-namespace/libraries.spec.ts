/**
 * Integration tests for third-party library injection via librariesModule.
 *
 * Verifies:
 *  1. Each library is accessible as a global inside user scripts
 *  2. Each library is accessible via pm.require()
 *  3. pm.require() with an unknown package throws with a helpful message
 *  4. Basic behaviour of each library works correctly
 */

import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"

// ---------------------------------------------------------------------------
// Helper: run a pre-request script and expect it to succeed (Right)
// ---------------------------------------------------------------------------
const expectPreRequestSuccess = (script: string) =>
  expect(
    runPreRequest(script, { global: [], selected: [] })()
  ).resolves.not.toEqualLeft(expect.anything())

// ---------------------------------------------------------------------------
// Helper: run a test script and expect it to succeed (Right)
// ---------------------------------------------------------------------------
const expectTestSuccess = async (script: string) => {
  const result = await runTest(script, { global: [], selected: [] })()
  expect(result).not.toEqualLeft(expect.anything())
}

// ===========================================================================
// 1. LODASH
// ===========================================================================
describe("libraries — lodash", () => {
  test("globalThis._ is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof _ === 'undefined') throw new Error('_ is undefined')
    `))

  test("globalThis.lodash is available as alias in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof lodash === 'undefined') throw new Error('lodash is undefined')
    `))

  test("pm.require('lodash') returns lodash in pre-request", () =>
    expectPreRequestSuccess(`
      const L = pm.require('lodash')
      if (typeof L !== 'function' && typeof L !== 'object') throw new Error('invalid')
    `))

  test("_.chunk works correctly", () =>
    expectPreRequestSuccess(`
      const result = _.chunk([1,2,3,4], 2)
      if (result[0][0] !== 1 || result[1][0] !== 3) throw new Error('chunk failed')
    `))

  test("lodash available in test script", async () =>
    expectTestSuccess(`
      const L = pm.require('lodash')
      pm.test('lodash chunk', () => {
        pm.expect(L.chunk([1,2,3,4], 2)).to.deep.equal([[1,2],[3,4]])
      })
    `))
})

// ===========================================================================
// 2. MOMENT
// ===========================================================================
describe("libraries — moment", () => {
  test("globalThis.moment is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof moment === 'undefined') throw new Error('moment is undefined')
    `))

  test("pm.require('moment') returns moment", () =>
    expectPreRequestSuccess(`
      const m = pm.require('moment')
      if (typeof m !== 'function') throw new Error('moment should be a function')
    `))

  test("moment can format a date", () =>
    expectPreRequestSuccess(`
      const m = pm.require('moment')
      const formatted = m('2024-01-15').format('YYYY/MM/DD')
      if (formatted !== '2024/01/15') throw new Error('format failed: ' + formatted)
    `))
})

// ===========================================================================
// 3. CRYPTO-JS
// ===========================================================================
describe("libraries — CryptoJS", () => {
  test("globalThis.CryptoJS is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof CryptoJS === 'undefined') throw new Error('CryptoJS is undefined')
    `))

  test("pm.require('crypto-js') returns CryptoJS", () =>
    expectPreRequestSuccess(`
      const CJS = pm.require('crypto-js')
      if (typeof CJS !== 'object') throw new Error('CryptoJS should be an object')
    `))

  test("CryptoJS MD5 works", () =>
    expectPreRequestSuccess(`
      const CJS = pm.require('crypto-js')
      const hash = CJS.MD5('hello').toString()
      if (hash !== '5d41402abc4b2a76b9719d911017c592') throw new Error('MD5 failed: ' + hash)
    `))

  test("CryptoJS SHA256 works", () =>
    expectPreRequestSuccess(`
      const CJS = pm.require('crypto-js')
      const hash = CJS.SHA256('abc').toString()
      if (typeof hash !== 'string' || hash.length !== 64) throw new Error('SHA256 failed')
    `))

  test("CryptoJS Base64 encode works", () =>
    expectPreRequestSuccess(`
      const CJS = pm.require('crypto-js')
      const encoded = CJS.enc.Base64.stringify(CJS.enc.Utf8.parse('hoppscotch'))
      if (encoded !== 'aG9wcHNjb3RjaA==') throw new Error('Base64 failed: ' + encoded)
    `))
})

// ===========================================================================
// 4. UUID
// ===========================================================================
describe("libraries — uuid", () => {
  test("globalThis.uuid is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof uuid === 'undefined') throw new Error('uuid is undefined')
    `))

  test("pm.require('uuid') returns uuid module", () =>
    expectPreRequestSuccess(`
      const u = pm.require('uuid')
      if (typeof u !== 'object') throw new Error('uuid should be an object')
    `))

  test("uuid.v4() generates a valid UUID", () =>
    expectPreRequestSuccess(`
      const u = pm.require('uuid')
      const id = u.v4()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) throw new Error('Invalid UUID: ' + id)
    `))
})

// ===========================================================================
// 5. XML2JS
// ===========================================================================
describe("libraries — xml2js", () => {
  test("globalThis.xml2js is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof xml2js === 'undefined') throw new Error('xml2js is undefined')
    `))

  test("pm.require('xml2js') returns xml2js module", () =>
    expectPreRequestSuccess(`
      const x = pm.require('xml2js')
      if (typeof x !== 'object') throw new Error('xml2js should be an object')
    `))

  test("xml2js.parseString parses XML to object", () =>
    expectPreRequestSuccess(`
      const x = pm.require('xml2js')
      let parsed = null
      x.parseString('<root><child>hello</child></root>', (err, result) => {
        if (err) throw err
        parsed = result
      })
      if (!parsed || !parsed.root || !parsed.root.child) throw new Error('parseString failed')
    `))
})

// ===========================================================================
// 6. CHEERIO
// ===========================================================================
describe("libraries — cheerio", () => {
  test("globalThis.cheerio is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof cheerio === 'undefined') throw new Error('cheerio is undefined')
    `))

  test("pm.require('cheerio') returns cheerio module", () =>
    expectPreRequestSuccess(`
      const c = pm.require('cheerio')
      if (typeof c !== 'object') throw new Error('cheerio should be an object')
    `))

  test("cheerio can parse HTML and query elements", () =>
    expectPreRequestSuccess(`
      const c = pm.require('cheerio')
      const $ = c.load('<h1 id="title">Hello World</h1>')
      const text = $('#title').text()
      if (text !== 'Hello World') throw new Error('cheerio query failed: ' + text)
    `))
})

// ===========================================================================
// 7. NODE-FORGE
// ===========================================================================
describe("libraries — node-forge", () => {
  test("globalThis.forge is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof forge === 'undefined') throw new Error('forge is undefined')
    `))

  test("pm.require('node-forge') returns forge module", () =>
    expectPreRequestSuccess(`
      const f = pm.require('node-forge')
      if (typeof f !== 'object') throw new Error('forge should be an object')
    `))

  test("forge.util.encode64 works (Base64)", () =>
    expectPreRequestSuccess(`
      const f = pm.require('node-forge')
      const encoded = f.util.encode64('hoppscotch')
      if (encoded !== 'aG9wcHNjb3RjaA==') throw new Error('encode64 failed: ' + encoded)
    `))
})

// ===========================================================================
// 8. TV4
// ===========================================================================
describe("libraries — tv4", () => {
  test("globalThis.tv4 is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof tv4 === 'undefined') throw new Error('tv4 is undefined')
    `))

  test("pm.require('tv4') returns tv4 module", () =>
    expectPreRequestSuccess(`
      const t = pm.require('tv4')
      if (typeof t !== 'object') throw new Error('tv4 should be an object')
    `))

  test("tv4.validate validates JSON Schema", () =>
    expectPreRequestSuccess(`
      const t = pm.require('tv4')
      const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
      const valid = t.validate({ name: 'hoppscotch' }, schema)
      if (!valid) throw new Error('tv4 validation failed: ' + t.error)
    `))

  test("tv4.validate rejects invalid data", () =>
    expectPreRequestSuccess(`
      const t = pm.require('tv4')
      const schema = { type: 'object', properties: { age: { type: 'number' } }, required: ['age'] }
      const valid = t.validate({ age: 'not-a-number' }, schema)
      if (valid) throw new Error('tv4 should have rejected invalid data')
    `))
})

// ===========================================================================
// 9. pm.require() ERROR HANDLING
// ===========================================================================
describe("pm.require() — error handling", () => {
  test("pm.require() throws with helpful message for unknown packages (pre-request)", () =>
    expect(
      runPreRequest('pm.require("some-unknown-pkg")', { global: [], selected: [] })()
    ).resolves.toEqualLeft(
      expect.stringContaining("pm.require('some-unknown-pkg') is not supported. Available libraries:")
    ))

  test("pm.require() error message lists available libraries (pre-request)", () =>
    expect(
      runPreRequest('pm.require("fake")', { global: [], selected: [] })()
    ).resolves.toEqualLeft(
      expect.stringContaining("lodash")
    ))

  test("pm.require() throws with helpful message for unknown packages (test script)", async () => {
    const result = await runTest('pm.require("unknown-lib")', { global: [], selected: [] })()
    expect(result).toEqualLeft(
      expect.stringContaining("pm.require('unknown-lib') is not supported. Available libraries:")
    )
  })
})

// ===========================================================================
// 10. AJV (Phase 4)
// ===========================================================================
describe("libraries — ajv", () => {
  test("globalThis.Ajv is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof Ajv === 'undefined') throw new Error('Ajv is undefined')
    `))

  test("pm.require('ajv') returns Ajv constructor", () =>
    expectPreRequestSuccess(`
      const AjvClass = pm.require('ajv')
      if (typeof AjvClass !== 'function') throw new Error('Ajv should be a constructor function')
    `))

  test("Ajv can validate a JSON Schema", () =>
    expectPreRequestSuccess(`
      const AjvClass = pm.require('ajv')
      const ajv = new AjvClass()
      const schema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
      const validate = ajv.compile(schema)
      if (!validate({ name: 'hoppscotch' })) throw new Error('Ajv validation failed: ' + ajv.errorsText(validate.errors))
    `))

  test("Ajv rejects invalid data with errors", () =>
    expectPreRequestSuccess(`
      const AjvClass = pm.require('ajv')
      const ajv = new AjvClass()
      const schema = { type: 'object', properties: { age: { type: 'number' } }, required: ['age'] }
      const validate = ajv.compile(schema)
      if (validate({ age: 'not-a-number' })) throw new Error('Ajv should have rejected invalid data')
    `))
})

// ===========================================================================
// 11. AJV-FORMATS (Phase 4)
// ===========================================================================
describe("libraries — ajv-formats", () => {
  test("globalThis.ajvFormats is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof ajvFormats === 'undefined') throw new Error('ajvFormats is undefined')
    `))

  test("pm.require('ajv-formats') returns addFormats function", () =>
    expectPreRequestSuccess(`
      const addFormats = pm.require('ajv-formats')
      if (typeof addFormats !== 'function') throw new Error('ajv-formats should be a function')
    `))

  test("ajv-formats validates date format", () =>
    expectPreRequestSuccess(`
      const AjvClass = pm.require('ajv')
      const addFormats = pm.require('ajv-formats')
      const ajv = new AjvClass()
      addFormats(ajv)
      const schema = { type: 'string', format: 'date' }
      const validate = ajv.compile(schema)
      if (!validate('2024-01-15')) throw new Error('valid date should pass')
      if (validate('not-a-date')) throw new Error('invalid date should fail')
    `))
})

// ===========================================================================
// 12. CHAI (Phase 5)
// ===========================================================================
describe("libraries — chai", () => {
  test("globalThis.chai is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof chai === 'undefined') throw new Error('chai is undefined')
    `))

  test("pm.require('chai') returns chai module", () =>
    expectPreRequestSuccess(`
      const c = pm.require('chai')
      if (typeof c !== 'object') throw new Error('chai should be an object')
    `))

  test("chai.expect works for assertions", () =>
    expectPreRequestSuccess(`
      const c = pm.require('chai')
      c.expect(42).to.equal(42)
      c.expect('hello').to.be.a('string')
      c.expect([1,2,3]).to.have.lengthOf(3)
    `))

  test("chai.assert works", () =>
    expectPreRequestSuccess(`
      const c = pm.require('chai')
      c.assert.equal(1 + 1, 2)
      c.assert.isString('hello')
      c.assert.isArray([1,2,3])
    `))

  test("chai.expect throws on failed assertion (caught)", () =>
    expectPreRequestSuccess(`
      const c = pm.require('chai')
      let threw = false
      try { c.expect(1).to.equal(2) } catch(e) { threw = true }
      if (!threw) throw new Error('chai.expect should throw on mismatch')
    `))
})

// ===========================================================================
// 13. JSONPATH-PLUS (Phase 5)
// ===========================================================================
describe("libraries — jsonpath-plus", () => {
  test("globalThis.JSONPath is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof JSONPath === 'undefined') throw new Error('JSONPath is undefined')
    `))

  test("pm.require('jsonpath-plus') returns JSONPath function", () =>
    expectPreRequestSuccess(`
      const JP = pm.require('jsonpath-plus')
      if (typeof JP !== 'function') throw new Error('JSONPath should be a function')
    `))

  test("JSONPath queries nested JSON data", () =>
    expectPreRequestSuccess(`
      const JP = pm.require('jsonpath-plus')
      const data = { store: { book: [{ title: 'Hoppscotch' }, { title: 'Postman' }] } }
      const titles = JP({ path: '$.store.book[*].title', json: data })
      if (!Array.isArray(titles) || titles.length !== 2) throw new Error('JSONPath failed: ' + JSON.stringify(titles))
      if (titles[0] !== 'Hoppscotch') throw new Error('Expected Hoppscotch, got: ' + titles[0])
    `))
})

// ===========================================================================
// 14. FORM-DATA (Phase 5)
// ===========================================================================
describe("libraries — form-data", () => {
  test("globalThis.FormDataNode is available in pre-request", () =>
    expectPreRequestSuccess(`
      if (typeof FormDataNode === 'undefined') throw new Error('FormDataNode is undefined')
    `))

  test("pm.require('form-data') returns FormData constructor", () =>
    expectPreRequestSuccess(`
      const FD = pm.require('form-data')
      if (typeof FD !== 'function') throw new Error('form-data should be a constructor')
    `))

  test("FormDataNode can create form with fields", () =>
    expectPreRequestSuccess(`
      const FD = pm.require('form-data')
      const form = new FD()
      form.append('username', 'hoppscotch')
      form.append('token', 'abc123')
      const headers = form.getHeaders()
      if (!headers['content-type'].startsWith('multipart/form-data')) throw new Error('unexpected content-type: ' + headers['content-type'])
    `))
})

// ===========================================================================
// 15. pm.libraryVersions() API (Section 7.3)
// ===========================================================================
describe("pm.libraryVersions()", () => {
  test("pm.libraryVersions() returns an object in pre-request", () =>
    expectPreRequestSuccess(`
      const versions = pm.libraryVersions()
      if (typeof versions !== 'object') throw new Error('libraryVersions should return an object')
    `))

  test("pm.libraryVersions() includes all 13 libraries", () =>
    expectPreRequestSuccess(`
      const versions = pm.libraryVersions()
      const expected = ['lodash','uuid','moment','xml2js','cheerio','crypto-js','node-forge','tv4','ajv','ajv-formats','chai','jsonpath-plus','form-data']
      for (const lib of expected) {
        if (!versions[lib]) throw new Error('Missing version for: ' + lib)
      }
    `))

  test("pm.libraryVersions() works in test script", async () =>
    expectTestSuccess(`
      pm.test('libraryVersions check', () => {
        const versions = pm.libraryVersions()
        pm.expect(versions).to.have.property('lodash')
        pm.expect(versions).to.have.property('ajv')
        pm.expect(versions).to.have.property('chai')
      })
    `))
})


