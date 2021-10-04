import axios from "axios"
import axiosStrategy from "../AxiosStrategy"
import { JsonFormattedError } from "~/helpers/utils/JsonFormattedError"

jest.mock("axios")
jest.mock("~/newstore/settings", () => {
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
      await axiosStrategy({ url: "test" })

      expect(axios).toBeCalledWith(
        expect.objectContaining({
          url: "test",
        })
      )
    })

    test("asks axios to return data as arraybuffer", async () => {
      await axiosStrategy({ url: "test" })

      expect(axios).toBeCalledWith(
        expect.objectContaining({
          responseType: "arraybuffer",
        })
      )
    })

    test("resolves successful requests", async () => {
      await expect(axiosStrategy({})).resolves.toBeDefined()
    })

    test("rejects cancel errors with text 'cancellation'", async () => {
      axios.isCancel.mockReturnValueOnce(true)
      axios.mockRejectedValue("err")

      await expect(axiosStrategy({})).rejects.toBe("cancellation")
    })

    test("rejects non-cancellation errors as-is", async () => {
      axios.isCancel.mockReturnValueOnce(false)
      axios.mockRejectedValue("err")

      await expect(axiosStrategy({})).rejects.toBe("err")
    })

    test("non-cancellation errors that have response data are thrown", async () => {
      const errorResponse = { error: "errr" }
      axios.isCancel.mockReturnValueOnce(false)
      axios.mockRejectedValue({
        response: {
          data: Buffer.from(JSON.stringify(errorResponse), "utf8").toString(
            "base64"
          ),
        },
      })

      await expect(axiosStrategy({})).rejects.toMatchObject(
        new JsonFormattedError(errorResponse)
      )
    })
  })
})
