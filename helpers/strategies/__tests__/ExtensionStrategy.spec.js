import extensionStrategy, {
  hasExtensionInstalled,
  hasChromeExtensionInstalled,
  hasFirefoxExtensionInstalled,
  cancelRunningExtensionRequest,
} from "../ExtensionStrategy"

jest.mock("../../utils/b64", () => {
  return {
    __esModule: true,
    decodeB64StringToArrayBuffer: jest.fn((data) => data + "-converted"),
  }
})

describe("hasExtensionInstalled", () => {
  test("returns true if extension is present and hooked", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {}

    expect(hasExtensionInstalled()).toEqual(true)
  })

  test("returns false if extension not present or not hooked", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = undefined

    expect(hasExtensionInstalled()).toEqual(false)
  })
})

describe("hasChromeExtensionInstalled", () => {
  test("returns true if extension is hooked and browser is chrome", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {}
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome")
    jest.spyOn(navigator, "vendor", "get").mockReturnValue("Google")

    expect(hasChromeExtensionInstalled()).toEqual(true)
  })

  test("returns false if extension is hooked and browser is not chrome", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {}
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox")
    jest.spyOn(navigator, "vendor", "get").mockReturnValue("Google")

    expect(hasChromeExtensionInstalled()).toEqual(false)
  })

  test("returns false if extension not installed and browser is chrome", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = undefined
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome")
    jest.spyOn(navigator, "vendor", "get").mockReturnValue("Google")

    expect(hasChromeExtensionInstalled()).toEqual(false)
  })

  test("returns false if extension not installed and browser is not chrome", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = undefined
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox")
    jest.spyOn(navigator, "vendor", "get").mockReturnValue("Google")

    expect(hasChromeExtensionInstalled()).toEqual(false)
  })
})

describe("hasFirefoxExtensionInstalled", () => {
  test("returns true if extension is hooked and browser is firefox", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {}
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox")

    expect(hasFirefoxExtensionInstalled()).toEqual(true)
  })

  test("returns false if extension is hooked and browser is not firefox", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {}
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome")

    expect(hasFirefoxExtensionInstalled()).toEqual(false)
  })

  test("returns false if extension not installed and browser is firefox", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = undefined
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Firefox")

    expect(hasFirefoxExtensionInstalled()).toEqual(false)
  })

  test("returns false if extension not installed and browser is not firefox", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = undefined
    jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome")

    expect(hasFirefoxExtensionInstalled()).toEqual(false)
  })
})

describe("cancelRunningExtensionRequest", () => {
  const cancelFunc = jest.fn()

  beforeEach(() => {
    cancelFunc.mockClear()
  })

  test("cancels request if extension installed and function present in hook", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {
      cancelRunningRequest: cancelFunc,
    }

    cancelRunningExtensionRequest()
    expect(cancelFunc).toHaveBeenCalledTimes(1)
  })

  test("does not cancel request if extension not installed", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = undefined

    cancelRunningExtensionRequest()
    expect(cancelFunc).not.toHaveBeenCalled()
  })

  test("does not cancel request if extension installed but function not present", () => {
    global.__POSTWOMAN_EXTENSION_HOOK__ = {}

    cancelRunningExtensionRequest()
    expect(cancelFunc).not.toHaveBeenCalled()
  })
})

describe("extensionStrategy", () => {
  const sendReqFunc = jest.fn()

  beforeEach(() => {
    sendReqFunc.mockClear()
  })

  describe("Proxy Requests", () => {
    const store = {
      state: {
        postwoman: {
          settings: {
            PROXY_ENABLED: true,
            PROXY_URL: "testURL",
          },
        },
      },
    }

    test("asks extension to send request", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":true,"data":""}',
      })

      await extensionStrategy({}, store)

      expect(sendReqFunc).toHaveBeenCalledTimes(1)
    })

    test("sends POST request to proxy if proxy is enabled", async () => {
      let passedUrl
      let passedMethod

      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockImplementation(({ method, url }) => {
        passedUrl = url
        passedMethod = method

        return Promise.resolve({
          data: '{"success":true,"data":""}',
        })
      })

      await extensionStrategy({}, store)

      expect(passedUrl).toEqual(store.state.postwoman.settings.PROXY_URL)
      expect(passedMethod).toEqual("post")
    })

    test("passes request fields properly", async () => {
      const reqFields = {
        testA: "testA",
        testB: "testB",
        testC: "testC",
      }

      let passedFields

      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockImplementation(({ data }) => {
        passedFields = data

        return Promise.resolve({
          data: '{"success":true,"data":""}',
        })
      })

      await extensionStrategy(reqFields, store)

      expect(passedFields).toMatchObject(reqFields)
    })

    test("passes wantsBinary field", async () => {
      let passedFields

      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockImplementation(({ data }) => {
        passedFields = data

        return Promise.resolve({
          data: '{"success":true,"data":""}',
        })
      })

      await extensionStrategy({}, store)

      expect(passedFields).toHaveProperty("wantsBinary")
    })

    test("checks for proxy response success field and throws error message for non-success", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":false,"data": { "message": "testerr" } }',
      })

      await expect(extensionStrategy({}, store)).rejects.toThrow("testerr")
    })

    test("checks for proxy response success field and throws error 'Proxy Error' for non-success", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":false,"data": {} }',
      })

      await expect(extensionStrategy({}, store)).rejects.toThrow("Proxy Error")
    })

    test("checks for proxy response success and doesn't throw for success", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":true,"data": {} }',
      })

      await expect(extensionStrategy({}, store)).resolves.toBeDefined()
    })

    test("checks isBinary response field and resolve with the converted value if so", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success": true, "isBinary": true, "data": "testdata" }',
      })

      await expect(extensionStrategy({}, store)).resolves.toMatchObject({
        data: "testdata-converted",
      })
    })

    test("checks isBinary response field and resolve with the actual value if not so", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success": true, "isBinary": false, "data": "testdata" }',
      })

      await expect(extensionStrategy({}, store)).resolves.toMatchObject({
        data: "testdata",
      })
    })

    test("failed request errors are thrown as-is", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockRejectedValue("err")

      await expect(extensionStrategy({}, store)).rejects.toBe("err")
    })
  })

  describe("Non-Proxy Requests", () => {
    const store = {
      state: {
        postwoman: {
          settings: {
            PROXY_ENABLED: false,
            PROXY_URL: "testURL",
          },
        },
      },
    }

    test("ask extension to send request", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":true,"data":""}',
      })

      await extensionStrategy({}, store)

      expect(sendReqFunc).toHaveBeenCalledTimes(1)
    })

    test("sends request to the actual sender if proxy disabled", async () => {
      let passedUrl

      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockImplementation(({ method, url }) => {
        passedUrl = url

        return Promise.resolve({
          data: '{"success":true,"data":""}',
        })
      })

      await extensionStrategy({ url: "test" }, store)

      expect(passedUrl).toEqual("test")
    })

    test("asks extension to get binary data", async () => {
      let passedFields

      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockImplementation((fields) => {
        passedFields = fields

        return Promise.resolve({
          data: '{"success":true,"data":""}',
        })
      })

      await extensionStrategy({}, store)

      expect(passedFields).toHaveProperty("wantsBinary")
    })

    test("resolves successful requests", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":true,"data":""}',
      })

      await expect(extensionStrategy({}, store)).resolves.toBeDefined()
    })

    test("rejects errors as-is", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockRejectedValue("err")

      await expect(extensionStrategy({}, store)).rejects.toBe("err")
    })
  })
})
