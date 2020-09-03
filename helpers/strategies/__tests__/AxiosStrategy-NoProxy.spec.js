import axios from "axios"
import axiosStrategy from "../AxiosStrategy"

jest.mock("axios")
axios.CancelToken.source.mockReturnValue({ token: "test" })
axios.mockResolvedValue({})

describe("axiosStrategy", () => {
  describe("No-Proxy Requests", () => {
    const store = {
      state: {
        postwoman: {
          settings: {
            PROXY_ENABLED: false,
            PROXY_URL: "test",
          },
        },
      },
    }

    test("sends request to the actual sender if proxy disabled", async () => {
      await axiosStrategy({ url: "test" }, store)

      expect(axios).toBeCalledWith(
        expect.objectContaining({
          url: "test",
        })
      )
    })

    test("asks axios to return data as arraybuffer", async () => {
      await axiosStrategy({ url: "test" }, store)

      expect(axios).toBeCalledWith(
        expect.objectContaining({
          responseType: "arraybuffer",
        })
      )
    })

    test("resolves successful requests", async () => {
      await expect(axiosStrategy({}, store)).resolves.toBeDefined()
    })

    test("rejects cancel errors with text 'cancellation'", async () => {
      axios.isCancel.mockReturnValueOnce(true)
      axios.mockRejectedValue("err")

      expect(axiosStrategy({}, store)).rejects.toBe("cancellation")
    })

    test("rejects non-cancellation errors as-is", async () => {
      axios.isCancel.mockReturnValueOnce(false)
      axios.mockRejectedValue("err")

      expect(axiosStrategy({}, store)).rejects.toBe("err")
    })
  })
})
