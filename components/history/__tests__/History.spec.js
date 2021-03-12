import History from "../"
import { fb } from "~/helpers/fb"
import { shallowMount } from "@vue/test-utils"

const restHistory = [
  {
    id: "0",
    type: "rest",
  },
  {
    id: "1",
    type: "rest",
  },
  {
    id: "2",
    type: "rest",
  },
]

const graphqlHistory = [
  {
    id: "0",
    type: "graphql",
  },
  {
    id: "1",
    type: "graphql",
  },
  {
    id: "2",
    type: "graphql",
  },
]

var localStorageMock = (function () {
  var store = {
    history: JSON.stringify(restHistory),
    graphqlHistory: JSON.stringify(graphqlHistory),
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
    currentHistory: restHistory,
    currentGraphqlHistory: graphqlHistory,
    clearHistory: jest.fn(),
    clearGraphqlHistory: jest.fn(),
    deleteHistory: jest.fn(),
    deleteGraphqlHistory: jest.fn(),
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
        template: "<div data-testid='rest_card' />",
      },
      HistoryGraphqlCard: {
        template: "<div data-testid='graphql_card' />",
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
  fb.clearHistory.mockClear()
  fb.clearGraphqlHistory.mockClear()
  fb.deleteHistory.mockClear()
  fb.deleteGraphqlHistory.mockClear()
  window.localStorage.setItem.mockClear()
})

describe("Mount History", () => {
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
})

describe("Clear History", () => {
  test("Clear rest history without login", async () => {
    fb.currentUser = null
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual(restHistory)
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearHistory).not.toHaveBeenCalled()
    expect(window.localStorage.setItem).toHaveBeenCalledWith("history", JSON.stringify([]))
  })
  test("Clear rest history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual(restHistory)
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearHistory).toHaveBeenCalledTimes(1)
    expect(window.localStorage.setItem).toHaveBeenCalledWith("history", JSON.stringify([]))
  })
  test("Dont confirm Clear rest history", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual(restHistory)
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='reject_clear_history']").trigger("click")
    expect(fb.clearHistory).not.toHaveBeenCalled()
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith("history", JSON.stringify([]))
  })

  test("Clear graphql history without login", async () => {
    fb.currentUser = null
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual(graphqlHistory)
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearGraphqlHistory).not.toHaveBeenCalled()
    expect(window.localStorage.setItem).toHaveBeenCalledWith("graphqlHistory", JSON.stringify([]))
  })
  test("Clear graphql history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual(graphqlHistory)
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='confirm_clear_history']").trigger("click")
    expect(fb.clearGraphqlHistory).toHaveBeenCalledTimes(1)
    expect(window.localStorage.setItem).toHaveBeenCalledWith("graphqlHistory", JSON.stringify([]))
  })
  test("Dont confirm Clear graphql history", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.vm.filteredHistory).toStrictEqual(graphqlHistory)
    await wrapper.find("button[data-testid='clear_history']").trigger("click")
    await wrapper.find("button[data-testid='reject_clear_history']").trigger("click")
    expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
      "graphqlHistory",
      JSON.stringify([])
    )
  })
})

describe("Use History", () => {
  test("use rest history", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.findAll("div[data-testid='rest_card']").length).toEqual(restHistory.length)
    var index = restHistory.length - 1
    wrapper.findAll("div[data-testid='rest_card']").at(index).vm.$emit("use-entry")
    expect(wrapper.emitted("useHistory")).toBeTruthy()
    expect(wrapper.emitted("useHistory")[0]).toStrictEqual([restHistory[index]])
  })

  test("use graphql history", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.findAll("div[data-testid='graphql_card']").length).toEqual(graphqlHistory.length)
    var index = restHistory.length - 1
    wrapper.findAll("div[data-testid='graphql_card']").at(index).vm.$emit("use-entry")
    expect(wrapper.emitted("useHistory")).toBeTruthy()
    expect(wrapper.emitted("useHistory")[0]).toStrictEqual([graphqlHistory[index]])
  })
})

describe("Delete History", () => {
  test("delete rest history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.findAll("div[data-testid='rest_card']").length).toEqual(restHistory.length)
    var index = 1
    wrapper.findAll("div[data-testid='rest_card']").at(index).vm.$emit("delete-entry")
    expect(fb.deleteHistory).toBeCalledWith(restHistory[index])
  })

  test("delete rest history without login", async () => {
    fb.currentUser = null
    const wrapper = factory({
      page: "rest",
    })
    expect(wrapper.findAll("div[data-testid='rest_card']").length).toEqual(restHistory.length)
    var index = 1
    wrapper.findAll("div[data-testid='rest_card']").at(index).vm.$emit("delete-entry")
    expect(window.localStorage.setItem).toBeCalledWith(
      "history",
      JSON.stringify(restHistory.filter((entry) => entry.id != index))
    )
  })
  test("delete graphql history with login", async () => {
    fb.currentUser = "user"
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.findAll("div[data-testid='graphql_card']").length).toEqual(graphqlHistory.length)
    var index = 1
    wrapper.findAll("div[data-testid='graphql_card']").at(index).vm.$emit("delete-entry")
    expect(fb.deleteGraphqlHistory).toBeCalledWith(graphqlHistory[index])
  })

  test("delete graphql history without login", async () => {
    fb.currentUser = null
    const wrapper = factory({
      page: "graphql",
    })
    expect(wrapper.findAll("div[data-testid='graphql_card']").length).toEqual(graphqlHistory.length)
    var index = 1
    wrapper.findAll("div[data-testid='graphql_card']").at(index).vm.$emit("delete-entry")
    expect(window.localStorage.setItem).toBeCalledWith(
      "graphqlHistory",
      JSON.stringify(graphqlHistory.filter((entry) => entry.id != index))
    )
  })
})
