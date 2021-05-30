import { shallowMount } from "@vue/test-utils"
import feeds from "../Feeds"

import { fb } from "~/helpers/fb"

jest.mock("~/helpers/fb", () => ({
  __esModule: true,

  fb: {
    currentFeeds: [
      {
        id: "test1",
        label: "First",
        message: "First Message",
      },
      {
        id: "test2",
        label: "Second",
      },
      {
        id: "test3",
        message: "Third Message",
      },
      {
        id: "test4",
      },
    ],
    deleteFeed: jest.fn(() => Promise.resolve()),
  },
}))

const factory = () =>
  shallowMount(feeds, {
    mocks: {
      $t: (text) => text,
      $toast: {
        error: jest.fn(),
      },
    },
  })

beforeEach(() => {
  fb.deleteFeed.mockClear()
})

describe("feeds", () => {
  test("mounts properly when proper components are given", () => {
    const wrapper = factory()

    expect(wrapper).toBeTruthy()
  })

  test("renders all the current feeds", () => {
    const wrapper = factory()

    expect(wrapper.findAll("div[data-test='list-item']").wrappers).toHaveLength(
      4
    )
  })

  test("feeds with no label displays the 'no_label' message", () => {
    const wrapper = factory()

    expect(
      wrapper
        .findAll("label[data-test='list-label']")
        .wrappers.map((e) => e.text())
        .filter((text) => text === "no_label")
    ).toHaveLength(2)
  })

  test("feeds with no message displays the 'empty' message", () => {
    const wrapper = factory()

    expect(
      wrapper
        .findAll("li[data-test='list-message']")
        .wrappers.map((e) => e.text())
        .filter((text) => text === "empty")
    ).toHaveLength(2)
  })

  test("labels in the list are proper", () => {
    const wrapper = factory()

    expect(
      wrapper
        .findAll("label[data-test='list-label']")
        .wrappers.map((e) => e.text())
    ).toEqual(["First", "Second", "no_label", "no_label"])
  })

  test("messages in the list are proper", () => {
    const wrapper = factory()

    expect(
      wrapper
        .findAll("li[data-test='list-message']")
        .wrappers.map((e) => e.text())
    ).toEqual(["First Message", "empty", "Third Message", "empty"])
  })

  test("clicking on the delete button deletes the feed", async () => {
    const wrapper = factory()

    const deleteButton = wrapper.find("button")

    await deleteButton.trigger("click")

    expect(fb.deleteFeed).toHaveBeenCalledTimes(1)
  })

  test("correct feed is passed to from the list for deletion", async () => {
    const wrapper = factory()

    const deleteButton = wrapper.find("button")

    await deleteButton.trigger("click")

    expect(fb.deleteFeed).toHaveBeenCalledWith("test1")
  })

  test("renders the 'empty' label if no elements in the current feeds", () => {
    jest.spyOn(fb, "currentFeeds", "get").mockReturnValueOnce([])

    const wrapper = factory()

    expect(wrapper.findAll("li").wrappers).toHaveLength(1)

    expect(wrapper.find("li").text()).toEqual("empty")
  })
})
