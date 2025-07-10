import { describe, expect, test } from "vitest"
import { isDOMElement, isTypableElement, isCodeMirrorEditor } from "../dom"

describe("isDOMElement", () => {
  test("returns true for valid HTMLElement", () => {
    const div = document.createElement("div")
    expect(isDOMElement(div)).toBe(true)
  })

  test("returns false for non-HTMLElement inputs", () => {
    expect(isDOMElement(null)).toBe(false)
    expect(isDOMElement(undefined)).toBe(false)
    expect(isDOMElement("div")).toBe(false)
    expect(isDOMElement(123)).toBe(false)
    expect(isDOMElement({})).toBe(false)
  })
})

describe("isTypableElement", () => {
  test("returns true for enabled <input>", () => {
    const input = document.createElement("input")
    expect(isTypableElement(input)).toBe(true)
  })

  test("returns false for disabled <input>", () => {
    const input = document.createElement("input")
    input.disabled = true
    expect(isTypableElement(input)).toBe(false)
  })

  test("returns true for enabled <textarea>", () => {
    const textarea = document.createElement("textarea")
    expect(isTypableElement(textarea)).toBe(true)
  })

  test("returns false for disabled <textarea>", () => {
    const textarea = document.createElement("textarea")
    textarea.disabled = true
    expect(isTypableElement(textarea)).toBe(false)
  })

  test("returns true for contentEditable element", () => {
    const div = document.createElement("div")
    div.isContentEditable = true
    expect(isTypableElement(div)).toBe(true)
  })

  test("returns false for regular non-typable div", () => {
    const div = document.createElement("div")
    expect(isTypableElement(div)).toBe(false)
  })
})

describe("isCodeMirrorEditor", () => {
  test("returns true if element is inside .cm-editor", () => {
    const wrapper = document.createElement("div")
    wrapper.classList.add("cm-editor")

    const child = document.createElement("div")
    wrapper.appendChild(child)
    document.body.appendChild(wrapper)

    expect(isCodeMirrorEditor(child)).toBe(true)
  })

  test("returns false if element is not inside .cm-editor", () => {
    const div = document.createElement("div")
    document.body.appendChild(div)

    expect(isCodeMirrorEditor(div)).toBe(false)
  })

  test("returns false if input is not an HTMLElement", () => {
    expect(isCodeMirrorEditor(null)).toBe(false)
    expect(isCodeMirrorEditor("not-an-element")).toBe(false)
  })
})
