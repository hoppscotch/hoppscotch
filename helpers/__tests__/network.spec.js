import { cancelRunningRequest, sendNetworkRequest } from "../network"

import AxiosStrategy, { cancelRunningAxiosRequest } from "../strategies/AxiosStrategy"
import ExtensionStrategy, {
  cancelRunningExtensionRequest,
  hasExtensionInstalled,
} from "../strategies/ExtensionStrategy"

jest.mock("../strategies/AxiosStrategy", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
  cancelRunningAxiosRequest: jest.fn(() => Promise.resolve()),
}))

jest.mock("../strategies/ExtensionStrategy", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
  cancelRunningExtensionRequest: jest.fn(() => Promise.resolve()),
  hasExtensionInstalled: jest.fn(),
}))

const extensionAllowedStore = {
  state: {
    postwoman: {
      settings: {
        EXTENSIONS_ENABLED: true,
      },
    },
  },
}

const extensionNotAllowedStore = {
  state: {
    postwoman: {
      settings: {
        EXTENSIONS_ENABLED: false,
      },
    },
  },
}

const extensionUndefinedStore = {
  state: {
    postwoman: {
      settings: {},
    },
  },
}

global.$nuxt = {
  $loading: {
    finish: jest.fn(() => Promise.resolve()),
  },
}

beforeEach(() => {
  jest.clearAllMocks() // Reset the call count for the mock functions
})

describe("cancelRunningRequest", () => {
  test("cancels only extension request if extension allowed in settings and is installed", () => {
    hasExtensionInstalled.mockReturnValue(true)

    cancelRunningRequest(extensionAllowedStore)

    expect(cancelRunningAxiosRequest).not.toHaveBeenCalled()
    expect(cancelRunningExtensionRequest).toHaveBeenCalled()
  })

  test("cancels only extension request if extension setting is undefined and extension is installed", () => {
    hasExtensionInstalled.mockReturnValue(true)

    cancelRunningRequest(extensionUndefinedStore)

    expect(cancelRunningAxiosRequest).not.toHaveBeenCalled()
    expect(cancelRunningExtensionRequest).toHaveBeenCalled()
  })

  test("cancels only axios request if extension not allowed in settings and extension is installed", () => {
    hasExtensionInstalled.mockReturnValue(true)

    cancelRunningRequest(extensionNotAllowedStore)

    expect(cancelRunningExtensionRequest).not.toHaveBeenCalled()
    expect(cancelRunningAxiosRequest).toHaveBeenCalled()
  })

  test("cancels only axios request if extension is allowed but not installed", () => {
    hasExtensionInstalled.mockReturnValue(false)

    cancelRunningRequest(extensionAllowedStore)

    expect(cancelRunningExtensionRequest).not.toHaveBeenCalled()
    expect(cancelRunningAxiosRequest).toHaveBeenCalled()
  })

  test("cancels only axios request if extension is not allowed and not installed", () => {
    hasExtensionInstalled.mockReturnValue(false)

    cancelRunningRequest(extensionNotAllowedStore)

    expect(cancelRunningExtensionRequest).not.toHaveBeenCalled()
    expect(cancelRunningAxiosRequest).toHaveBeenCalled()
  })

  test("cancels only axios request if extension setting is undefined and not installed", () => {
    hasExtensionInstalled.mockReturnValue(false)

    cancelRunningRequest(extensionUndefinedStore)

    expect(cancelRunningExtensionRequest).not.toHaveBeenCalled()
    expect(cancelRunningAxiosRequest).toHaveBeenCalled()
  })
})

describe("sendNetworkRequest", () => {
  test("runs only extension request if extension allowed in settings and is installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(true)

    await sendNetworkRequest({}, extensionAllowedStore)

    expect(AxiosStrategy).not.toHaveBeenCalled()
    expect(ExtensionStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })

  test("runs only extension request if extension setting is undefined and extension is installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(true)

    await sendNetworkRequest({}, extensionUndefinedStore)

    expect(AxiosStrategy).not.toHaveBeenCalled()
    expect(ExtensionStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })

  test("runs only axios request if extension not allowed in settings and extension is installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(true)

    await sendNetworkRequest({}, extensionNotAllowedStore)

    expect(ExtensionStrategy).not.toHaveBeenCalled()
    expect(AxiosStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })

  test("runs only axios request if extension is allowed but not installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(false)

    await sendNetworkRequest({}, extensionAllowedStore)

    expect(ExtensionStrategy).not.toHaveBeenCalled()
    expect(AxiosStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })

  test("runs only axios request if extension is not allowed and not installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(false)

    await sendNetworkRequest({}, extensionNotAllowedStore)

    expect(ExtensionStrategy).not.toHaveBeenCalled()
    expect(AxiosStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })

  test("runs only axios request if extension setting is undefined and not installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(false)

    await sendNetworkRequest({}, extensionUndefinedStore)

    expect(ExtensionStrategy).not.toHaveBeenCalled()
    expect(AxiosStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })
})
