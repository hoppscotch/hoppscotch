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

  lenses
    .filter(({ lensName }) => lensName != rawLens.lensName)
    .forEach((el) => {
      test(`returns ${el.lensName} lens for its content-types`, () => {
        el.supportedContentTypes.forEach((contentType) => {
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
        el.supportedContentTypes.forEach((contentType) => {
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
