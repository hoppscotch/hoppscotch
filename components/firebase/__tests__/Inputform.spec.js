import { shallowMount } from "@vue/test-utils"
import inputform from "../Inputform"

import { fb } from "~/helpers/fb"

jest.mock("~/helpers/fb", () => ({
  __esModule: true,

  fb: {
    writeFeeds: jest.fn(() => Promise.resolve()),
  },
}))

const factory = () =>
  shallowMount(inputform, {
    mocks: {
      $t: (text) => text,
    },
  })

beforeEach(() => {
  fb.writeFeeds.mockClear()
})

describe("inputform", () => {
  test("mounts properly", () => {
    const wrapper = factory()

    expect(wrapper).toBeTruthy()
  })
  test("calls writeFeeds when submitted properly", async () => {
    const wrapper = factory()

    const addButton = wrapper.find("button")
    const [messageInput, labelInput] = wrapper.findAll("input").wrappers

    await messageInput.setValue("test message")
    await labelInput.setValue("test label")

    await addButton.trigger("click")

    expect(fb.writeFeeds).toHaveBeenCalledTimes(1)
  })
  test("doesn't call writeFeeds when submitted without a data", async () => {
    const wrapper = factory()

    const addButton = wrapper.find("button")

    await addButton.trigger("click")

    expect(fb.writeFeeds).not.toHaveBeenCalled()
  })
  test("doesn't call writeFeeds when message or label is null", async () => {
    const wrapper = factory()

    const addButton = wrapper.find("button")
    const [messageInput, labelInput] = wrapper.findAll("input").wrappers

    await messageInput.setValue(null)
    await labelInput.setValue(null)

    await addButton.trigger("click")

    expect(fb.writeFeeds).not.toHaveBeenCalled()
  })
  test("doesn't call writeFeeds when message or label is empty", async () => {
    const wrapper = factory()

    const addButton = wrapper.find("button")
    const [messageInput, labelInput] = wrapper.findAll("input").wrappers

    await messageInput.setValue("")
    await labelInput.setValue("")

    await addButton.trigger("click")

    expect(fb.writeFeeds).not.toHaveBeenCalled()
  })
  test("calls writeFeeds with correct values", async () => {
    const wrapper = factory()

    const addButton = wrapper.find("button")
    const [messageInput, labelInput] = wrapper.findAll("input").wrappers

    await messageInput.setValue("test message")
    await labelInput.setValue("test label")

    await addButton.trigger("click")

    expect(fb.writeFeeds).toHaveBeenCalledWith("test message", "test label")
  })
})
