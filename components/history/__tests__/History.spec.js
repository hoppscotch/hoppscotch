import History from "../"
import { fb } from "~/helpers/fb"
import { shallowMount } from "@vue/test-utils"

var localStorageMock = (function () {
  var store = {
    history: JSON.stringify([{ type: "rest" }]),
    graphqlHistory: JSON.stringify([{ type: "graphql" }]),
  }
  return {
    getItem: function (key) {
      return store[key]
    },
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
  }
})()
Object.defineProperty(window, "localStorage", { value: localStorageMock })

jest.mock("~/helpers/fb", () => ({
  __esModule: true,

  fb: {
    currentUser: null,
    currentHistory: [{ type: "rest" }],
    currentGraphqlHistory: [{ type: "graphql" }],
    clearHistory: jest.fn(() => Promise.resolve()),
    clearGraphqlHistory: jest.fn(() => Promise.resolve()),
  },
}))

const factory = (props) => {
  return shallowMount(History, {
    propsData: props,
    stubs: {
      "v-popover": {
        template: "<div><slot /><slot name='popover' :is-open=true /></div>",
      },
      HistoryRestCard: {
        template: "<div />",
      },
      HistoryGraphqlCard: {
        template: "<div />",
      },
      AppSection: {
        template: "<div><slot /></div>",
      },
    },
    mocks: {
      $t: (text) => text,
      $toast: {
        error() {},
      },
    },
    directives: {
      tooltip() {
        /* stub */
      },
      closePopover() {
        /* stub */
      },
    },
  })
}

beforeEach(() => {
  window.localStorage.setItem("history", JSON.stringify([{ type: "rest" }]))
  window.localStorage.setItem("graphqlHistory", JSON.stringify([{ type: "graphql" }]))
})

describe("History", () => {
  test("Mounts rest history without login", async () => {
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper).toBeTruthy()
  })

  test("Mounts rest history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper).toBeTruthy()
  })

  test("Mounts graphql history without login", async () => {
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper).toBeTruthy()
  })

  test("Mounts graphql history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper).toBeTruthy()
  })

  test("Clear rest history without login", async () => {
    fb.currentUser = null
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual([{ type: "rest" }])
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearHistory).toHaveBeenCalledTimes(0)
    expect(window.localStorage.setItem).toHaveBeenCalled()
    expect(window.localStorage.setItem).toHaveBeenCalledWith("history", JSON.stringify([]))
  })
  test("Clear rest history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual([{ type: "rest" }])
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearHistory).toHaveBeenCalledTimes(1)
    expect(window.localStorage.setItem).toHaveBeenCalled()
    expect(window.localStorage.setItem).toHaveBeenCalledWith("history", JSON.stringify([]))
  })
  test("Clear graphql history without login", async () => {
    fb.currentUser = null
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual([{ type: "graphql" }])
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearGraphqlHistory).toHaveBeenCalledTimes(0)
    expect(window.localStorage.setItem).toHaveBeenCalled()
    expect(window.localStorage.setItem).toHaveBeenCalledWith("graphqlHistory", JSON.stringify([]))
  })
  test("Clear graphql history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual([{ type: "graphql" }])
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearGraphqlHistory).toHaveBeenCalledTimes(1)
    expect(window.localStorage.setItem).toHaveBeenCalled()
    expect(window.localStorage.setItem).toHaveBeenCalledWith("graphqlHistory", JSON.stringify([]))
  })
})
