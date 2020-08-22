import axios from "axios"
import axiosStrategy, { testables, cancelRunningAxiosRequest } from "../AxiosStrategy"

jest.mock("../../utils/b64", () => {
  return {
    __esModule: true,
    decodeB64StringToArrayBuffer: jest.fn((data) => data + "-converted"),
  }
})

describe("cancelRunningAxiosRequest", () => {
  test("cancels axios request and does that only 1 time", () => {
    const cancelFunc = jest.spyOn(testables.cancelSource, "cancel")

    cancelRunningAxiosRequest()
    expect(cancelFunc).toHaveBeenCalledTimes(1)
  })
})

describe("axiosStrategy", () => {
  describe("Proxy Requests", () => {
    const store = {
      state: {
        postwoman: {
          settings: {
            PROXY_ENABLED: true,
            PROXY_URL: "test",
          },
        },
      },
    }

    test("sends POST request to proxy if proxy is enabled", async () => {
      let passedURL

      jest.spyOn(axios, "post").mockImplementation((url) => {
        passedURL = url
        return Promise.resolve({ data: { success: true, isBinary: false } })
      })

      await axiosStrategy({}, store)

      expect(passedURL).toEqual("test")
    })

    test("passes request fields to axios properly", async () => {
      const reqFields = {
        testA: "testA",
        testB: "testB",
        testC: "testC",
      }

      let passedFields

      jest.spyOn(axios, "post").mockImplementation((_url, req) => {
        passedFields = req
        return Promise.resolve({ data: { success: true, isBinary: false } })
      })

      await axiosStrategy(reqFields, store)

      expect(passedFields).toMatchObject(reqFields)
    })

    test("passes wantsBinary field", async () => {
      let passedFields

      jest.spyOn(axios, "post").mockImplementation((_url, req) => {
        passedFields = req
        return Promise.resolve({ data: { success: true, isBinary: false } })
      })

      await axiosStrategy({}, store)

      expect(passedFields).toHaveProperty("wantsBinary")
    })

    test("checks for proxy response success field and throws error message for non-success", async () => {
      jest.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: false,
          data: {
            message: "test message",
          },
        },
      })

      await expect(axiosStrategy({}, store)).rejects.toThrow("test message")
    })

    test("checks for proxy response success field and throws error 'Proxy Error' for non-success", async () => {
      jest.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: false,
          data: {},
        },
      })

      await expect(axiosStrategy({}, store)).rejects.toThrow("Proxy Error")
    })

    test("checks for proxy response success and doesn't throw for success", async () => {
      jest.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: true,
          data: {},
        },
      })

      await expect(axiosStrategy({}, store)).resolves.toBeDefined()
    })

    test("checks isBinary response field and resolve with the converted value if so", async () => {
      jest.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: true,
          isBinary: true,
          data: "testdata",
        },
      })

      await expect(axiosStrategy({}, store)).resolves.toMatchObject({
        data: "testdata-converted",
      })
    })

    test("checks isBinary response field and resolve with the actual value if not so", async () => {
      jest.spyOn(axios, "post").mockResolvedValue({
        data: {
          success: true,
          isBinary: false,
          data: "testdata",
        },
      })

      await expect(axiosStrategy({}, store)).resolves.toMatchObject({
        data: "testdata",
      })
    })

    test("cancel errors are thrown with the string 'cancellation'", async () => {
      jest.spyOn(axios, "post").mockRejectedValue("errr")
      jest.spyOn(axios, "isCancel").mockReturnValueOnce(true)

      await expect(axiosStrategy({}, store)).rejects.toBe("cancellation")
    })

    test("non-cancellation errors are thrown", async () => {
      jest.spyOn(axios, "post").mockRejectedValue("errr")
      jest.spyOn(axios, "isCancel").mockReturnValueOnce(false)

      await expect(axiosStrategy({}, store)).rejects.toBe("errr")
    })
  })

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
      // jest.mock("axios")
      // await axiosStrategy({ url: "test" }, store)
      // expect(axiosFunc).toBeCalledWith(expect.objectContaining({
      //     url: "test"
      // }))
    })

    test("asks axios to return data as arraybuffer", () => {})

    test("resolves successful requests", () => {})

    test("rejects cancel errors with text 'cancellation'", () => {})

    test("rejects non-cancellation errors as-is", () => {})
  })
})
