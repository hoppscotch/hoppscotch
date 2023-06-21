import { describe, test, expect, vi } from "vitest"
import axios from "axios"
import axiosStrategy from "../AxiosStrategy"

vi.mock("../../utils/b64", () => ({
  __esModule: true,
  decodeB64StringToArrayBuffer: vi.fn((data) => `${data}-converted`),
}))
vi.mock("~/newstore/settings", () => {
  return {
    __esModule: true,
    settingsStore: {
      value: {
        PROXY_ENABLED: true,
        PROXY_URL: "test",
      },
    },
  }
})

describe("axiosStrategy", () => {
  describe("Proxy Requests", () => {
    test("sends POST request to proxy if proxy is enabled", async () => {
      let passedURL

      vi.spyOn(axios, "post").mockImplementation((url) => {
        passedURL = url
        return Promise.resolve({ data: { success: true, isBinary: false } })
      })

      await axiosStrategy({})()

      expect(passedURL).toEqual("test")
    })

    test("passes request fields to axios properly", async () => {
      const reqFields = {
        testA: "testA",
        testB: "testB",
        testC: "testC",
      }

      let passedFields

      vi.spyOn(axios, "post").mockImplementation((_url, req) => {
        passedFields = req
        return Promise.resolve({ data: { success: true, isBinary: false } })
      })

      await axiosStrategy(reqFields)()

      expect(passedFields).toMatchObject(reqFields)
    })

    test("passes wantsBinary field", async () => {
      let passedFields

      vi.spyOn(axios, "post").mockImplementation((_url, req) => {
        passedFields = req
        return Promise.resolve({ data: { success: true, isBinary: false } })
      })

      await axiosStrategy({})()

      expect(passedFields).toHaveProperty("wantsBinary")
    })

    test("checks for proxy response success field and throws error message for non-success", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: false,
          data: {
            message: "test message",
          },
        },
      })

      expect(await axiosStrategy({})()).toEqualLeft("test message")
    })

    test("checks for proxy response success field and throws error 'Proxy Error' for non-success", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: false,
          data: {},
        },
      })

      expect(await axiosStrategy({})()).toBeLeft("Proxy Error")
    })

    test("checks for proxy response success and doesn't left for success", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: true,
          data: {},
        },
      })

      expect(await axiosStrategy({})()).toBeRight()
    })

    test("checks isBinary response field and right with the converted value if so", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: true,
          isBinary: true,
          data: "testdata",
        },
      })

      expect(await axiosStrategy({})()).toSubsetEqualRight({
        data: "testdata-converted",
      })
    })

    test("checks isBinary response field and right with the actual value if not so", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: true,
          isBinary: false,
          data: "testdata",
        },
      })

      expect(await axiosStrategy({})()).toSubsetEqualRight({
        data: "testdata",
      })
    })

    test("cancel errors are returned a left with the string 'cancellation'", async () => {
      vi.spyOn(axios, "post").mockRejectedValue("errr")
      vi.spyOn(axios, "isCancel").mockReturnValueOnce(true)

      expect(await axiosStrategy({})()).toEqualLeft("cancellation")
    })

    test("non-cancellation errors return a left", async () => {
      vi.spyOn(axios, "post").mockRejectedValue("errr")
      vi.spyOn(axios, "isCancel").mockReturnValueOnce(false)

      expect(await axiosStrategy({})()).toEqualLeft("errr")
    })
  })
})
