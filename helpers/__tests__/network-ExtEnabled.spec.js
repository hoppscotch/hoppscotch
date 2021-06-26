import { cancelRunningRequest, sendNetworkRequest } from "../network"

import AxiosStrategy, {
  cancelRunningAxiosRequest,
} from "../strategies/AxiosStrategy"
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

jest.mock("~/newstore/settings", () => {
  return {
    settingsStore: {
      value: {
        EXTENSIONS_ENABLED: true,
      },
    },
  }
})

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

    cancelRunningRequest()

    expect(cancelRunningAxiosRequest).not.toHaveBeenCalled()
    expect(cancelRunningExtensionRequest).toHaveBeenCalled()
  })
  test("cancels only axios request if extension is allowed but not installed", () => {
    hasExtensionInstalled.mockReturnValue(false)

    cancelRunningRequest()

    expect(cancelRunningExtensionRequest).not.toHaveBeenCalled()
    expect(cancelRunningAxiosRequest).toHaveBeenCalled()
  })
})

describe("sendNetworkRequest", () => {
  test("runs only extension request if extension allowed in settings and is installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(true)

    await sendNetworkRequest({})

    expect(AxiosStrategy).not.toHaveBeenCalled()
    expect(ExtensionStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })

  test("runs only axios request if extension is allowed but not installed and clears the progress bar", async () => {
    hasExtensionInstalled.mockReturnValue(false)

    await sendNetworkRequest({})

    expect(ExtensionStrategy).not.toHaveBeenCalled()
    expect(AxiosStrategy).toHaveBeenCalled()
    expect(global.$nuxt.$loading.finish).toHaveBeenCalled()
  })
})
