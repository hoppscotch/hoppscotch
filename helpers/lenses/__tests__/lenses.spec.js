import { lenses, getSuitableLenses, getLensRenderers } from "../lenses"
import rawLens from "../rawLens"

describe("getSuitableLenses", () => {
  test("returns raw lens if no content type reported (null/undefined)", () => {
    const nullResult = getSuitableLenses({
      headers: {
        "content-type": null,
      },
    })

    const undefinedResult = getSuitableLenses({
      headers: {},
    })

    expect(nullResult).toHaveLength(1)
    expect(nullResult).toContainEqual(rawLens)

    expect(undefinedResult).toHaveLength(1)
    expect(undefinedResult).toContainEqual(rawLens)
  })

  const contentTypes = {
    JSON: ["application/json", "application/ld+json", "application/hal+json; charset=utf8"],
    Image: [
      "image/gif",
      "image/jpeg; foo=bar",
      "image/png",
      "image/bmp",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ],
    HTML: ["text/html", "application/xhtml+xml", "text/html; charset=utf-8"],
    XML: ["text/xml", "application/xml", "application/xhtml+xml; charset=utf-8"],
  }

  lenses
    .filter(({ lensName }) => lensName != rawLens.lensName)
    .forEach((el) => {
      test(`returns ${el.lensName} lens for its content-types`, () => {
        contentTypes[el.lensName].forEach((contentType) => {
          expect(
            getSuitableLenses({
              headers: {
                "content-type": contentType,
              },
            })
          ).toContainEqual(el)
        })
      })

      test(`returns Raw Lens along with ${el.lensName} for the content types`, () => {
        contentTypes[el.lensName].forEach((contentType) => {
          expect(
            getSuitableLenses({
              headers: {
                "content-type": contentType,
              },
            })
          ).toContainEqual(rawLens)
        })
      })
    })
})

describe("getLensRenderers", () => {
  test("returns all the lens renderers", () => {
    const res = getLensRenderers()

    lenses.forEach(({ renderer, rendererImport }) => {
      expect(res).toHaveProperty(renderer)
      expect(res[renderer]).toBe(rendererImport)
    })
  })
})
