import extensionStrategy, {
  hasExtensionInstalled,
  hasChromeExtensionInstalled,
  hasFirefoxExtensionInstalled,
  cancelRunningExtensionRequest,
} from "../ExtensionStrategy"

jest.mock("../../utils/b64", () => ({
  __esModule: true,
  decodeB64StringToArrayBuffer: jest.fn((data) => `${data}-converted`),
}))

jest.mock("~/newstore/settings", () => {
  return {
    __esModule: true,
    settingsStore: {
      value: {
        EXTENSIONS_ENABLED: true,
        PROXY_ENABLED: false,
      },
    },
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

  describe("Non-Proxy Requests", () => {
    test("ask extension to send request", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":true,"data":""}',
      })

      await extensionStrategy({})()

      expect(sendReqFunc).toHaveBeenCalledTimes(1)
    })

    test("sends request to the actual sender if proxy disabled", async () => {
      let passedUrl

      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockImplementation(({ url }) => {
        passedUrl = url

        return Promise.resolve({
          data: '{"success":true,"data":""}',
        })
      })

      await extensionStrategy({ url: "test" })()

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

      await extensionStrategy({})()

      expect(passedFields).toHaveProperty("wantsBinary")
    })

    test("rights successful requests", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockResolvedValue({
        data: '{"success":true,"data":""}',
      })

      expect(await extensionStrategy({})()).toBeRight()
    })

    test("rejects errors as-is", async () => {
      global.__POSTWOMAN_EXTENSION_HOOK__ = {
        sendRequest: sendReqFunc,
      }

      sendReqFunc.mockRejectedValue("err")

      expect(await extensionStrategy({})()).toEqualLeft("err")
    })
  })
})
