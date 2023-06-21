import { vi, describe, expect, test } from "vitest"
import axios from "axios"
import axiosStrategy from "../AxiosStrategy"

vi.mock("axios")
vi.mock("~/newstore/settings", () => {
  return {
    __esModule: true,
    settingsStore: {
      value: {
        PROXY_ENABLED: false,
      },
    },
  }
})

axios.CancelToken.source.mockReturnValue({ token: "test" })
axios.mockResolvedValue({})

describe("axiosStrategy", () => {
  describe("No-Proxy Requests", () => {
    test("sends request to the actual sender if proxy disabled", async () => {
      await axiosStrategy({ url: "test" })()

      expect(axios).toBeCalledWith(
        expect.objectContaining({
          url: "test",
        })
      )
    })

    test("asks axios to return data as arraybuffer", async () => {
      await axiosStrategy({ url: "test" })()

      expect(axios).toBeCalledWith(
        expect.objectContaining({
          responseType: "arraybuffer",
        })
      )
    })

    test("resolves successful requests", async () => {
      expect(await axiosStrategy({})()).toBeRight()
    })

    test("rejects cancel errors with text 'cancellation'", async () => {
      axios.isCancel.mockReturnValueOnce(true)
      axios.mockRejectedValue("err")

      expect(await axiosStrategy({})()).toEqualLeft("cancellation")
    })

    test("rejects non-cancellation errors as-is", async () => {
      axios.isCancel.mockReturnValueOnce(false)
      axios.mockRejectedValue("err")

      expect(await axiosStrategy({})()).toEqualLeft("err")
    })

    test("non-cancellation errors that have response data are right", async () => {
      const errorResponse = { error: "errr" }
      axios.isCancel.mockReturnValueOnce(false)
      axios.mockRejectedValue({
        response: {
          data: Buffer.from(JSON.stringify(errorResponse), "utf8").toString(
            "base64"
          ),
        },
      })

      expect(await axiosStrategy({})()).toSubsetEqualRight({
        data: "eyJlcnJvciI6ImVycnIifQ==",
      })
    })
  })
})
