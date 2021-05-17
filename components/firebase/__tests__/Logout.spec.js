import { shallowMount, createLocalVue } from "@vue/test-utils"
import logout from "../Logout"

import { fb } from "~/helpers/fb"

jest.mock("~/helpers/fb", () => ({
  __esModule: true,

  fb: {
    signOutUser: jest.fn(() => Promise.resolve()),
  },
}))

const $toast = {
  info: jest.fn(),
  show: jest.fn(),
}

const localVue = createLocalVue()

localVue.directive("close-popover", {})

const factory = () =>
  shallowMount(logout, {
    mocks: {
      $t: (text) => text,
      $toast,
    },
    localVue,
  })

beforeEach(() => {
  fb.signOutUser.mockClear()
  $toast.info.mockClear()
  $toast.show.mockClear()
})

describe("logout", () => {
  test("mounts properly", () => {
    const wrapper = factory()

    expect(wrapper).toBeTruthy()
  })

  test("clicking the logout button fires the logout firebase function", async () => {
    const wrapper = factory()

    const button = wrapper.find("button")

    await button.trigger("click")

    expect(fb.signOutUser).toHaveBeenCalledTimes(1)
  })

  test("failed signout request fires a error toast", async () => {
    fb.signOutUser.mockImplementationOnce(() =>
      Promise.reject(new Error("test reject"))
    )

    const wrapper = factory()
    const button = wrapper.find("button")
    await button.trigger("click")

    expect($toast.show).toHaveBeenCalledTimes(1)
    expect($toast.show).toHaveBeenCalledWith("test reject", expect.anything())
  })
})
