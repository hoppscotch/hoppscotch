import axios from "axios"
import axiosStrategy from "../AxiosStrategy"

jest.mock("axios")
jest.mock("~/newstore/settings", () => {
  return {
    __esModule: true,
    settingsStore: {
      value: {
        PROXY_ENABLED: false
      }
    }
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

      expect(axiosStrategy({})).rejects.toBe("cancellation")
    })

    test("rejects non-cancellation errors as-is", async () => {
      axios.isCancel.mockReturnValueOnce(false)
      axios.mockRejectedValue("err")

      expect(axiosStrategy({})).rejects.toBe("err")
    })
  })
})
