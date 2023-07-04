import { beforeEach, describe, it, expect, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { UserSpotlightSearcherService } from "../user.searcher"
import { nextTick, ref } from "vue"
import { SpotlightService } from "../.."

async function flushPromises() {
  return await new Promise((r) => setTimeout(r))
}

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string) => x,
}))

const actionsMock = vi.hoisted(() => ({
  value: ["user.login"],
  invokeAction: vi.fn(),
}))

vi.mock("~/helpers/actions", async () => {
  const { BehaviorSubject }: any = await vi.importActual("rxjs")

  return {
    __esModule: true,
    activeActions$: new BehaviorSubject(actionsMock.value),
    invokeAction: actionsMock.invokeAction,
  }
})

describe("UserSearcher", () => {
  beforeEach(() => {
    let x = actionsMock.value.pop()
    while (x) {
      x = actionsMock.value.pop()
    }

    actionsMock.invokeAction.mockReset()
  })

  it("registers with the spotlight service upon initialization", async () => {
    const container = new TestContainer()

    const registerSearcherFn = vi.fn()

    container.bindMock(SpotlightService, {
      registerSearcher: registerSearcherFn,
    })

    const user = container.bind(UserSpotlightSearcherService)
    await flushPromises()

    expect(registerSearcherFn).toHaveBeenCalledOnce()
    expect(registerSearcherFn).toHaveBeenCalledWith(user)
  })

  it("if login action is available, the search result should have the login result", async () => {
    const container = new TestContainer()

    actionsMock.value.push("user.login")
    const user = container.bind(UserSpotlightSearcherService)
    await flushPromises()

    const query = ref("log")
    const result = user.createSearchSession(query)[0]
    await nextTick()

    expect(result.value.results).toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )
  })

  it("if login action is not available, the search result should not have the login result", async () => {
    const container = new TestContainer()

    const user = container.bind(UserSpotlightSearcherService)
    await flushPromises()

    const query = ref("log")
    const result = user.createSearchSession(query)[0]
    await nextTick()

    expect(result.value.results).not.toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )
  })

  it("if logout action is available, the search result should have the logout result", async () => {
    const container = new TestContainer()

    actionsMock.value.push("user.logout")
    const user = container.bind(UserSpotlightSearcherService)
    await flushPromises()

    const query = ref("log")
    const result = user.createSearchSession(query)[0]
    await nextTick()

    expect(result.value.results).toContainEqual(
      expect.objectContaining({
        id: "logout",
      })
    )
  })

  it("if logout action is not available, the search result should not have the logout result", async () => {
    const container = new TestContainer()

    const user = container.bind(UserSpotlightSearcherService)
    await flushPromises()

    const query = ref("log")
    const result = user.createSearchSession(query)[0]
    await nextTick()

    expect(result.value.results).not.toContainEqual(
      expect.objectContaining({
        id: "logout",
      })
    )
  })

  it("if login action and logout action are available, the search result should have both results", async () => {
    const container = new TestContainer()

    actionsMock.value.push("user.login", "user.logout")
    const user = container.bind(UserSpotlightSearcherService)
    await flushPromises()

    const query = ref("log")
    const result = user.createSearchSession(query)[0]
    await nextTick()

    expect(result.value.results).toContainEqual(
      expect.objectContaining({
        id: "logout",
      })
    )

    expect(result.value.results).toContainEqual(
      expect.objectContaining({
        id: "login",
      })
    )
  })

  it("selecting the login event should invoke the login action", () => {
    const container = new TestContainer()

    actionsMock.value.push("user.login")
    const user = container.bind(UserSpotlightSearcherService)
    const query = ref("log")

    user.createSearchSession(query)[0]

    user.onDocSelected("login")

    expect(actionsMock.invokeAction).toHaveBeenCalledOnce()
    expect(actionsMock.invokeAction).toHaveBeenCalledWith("user.login")
  })

  it("selecting the logout event should invoke the logout action", () => {
    const container = new TestContainer()

    actionsMock.value.push("user.logout")
    const user = container.bind(UserSpotlightSearcherService)
    const query = ref("log")

    user.createSearchSession(query)[0]

    user.onDocSelected("logout")
    expect(actionsMock.invokeAction).toHaveBeenCalledOnce()
    expect(actionsMock.invokeAction).toHaveBeenCalledWith("user.logout")
  })

  it("selecting an invalid event should not invoke any action", () => {
    const container = new TestContainer()

    actionsMock.value.push("user.logout")
    const user = container.bind(UserSpotlightSearcherService)
    const query = ref("log")

    user.createSearchSession(query)[0]

    user.onDocSelected("bla")
    expect(actionsMock.invokeAction).not.toHaveBeenCalled()
  })
})
