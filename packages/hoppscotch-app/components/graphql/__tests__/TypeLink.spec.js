import { shallowMount } from "@vue/test-utils"
import { GraphQLInt } from "graphql"
import typelink from "../TypeLink.vue"

const factory = (props) =>
  shallowMount(typelink, {
    propsData: props,
  })

const gqlType = {
  toString: () => "TestType",
}

describe("typelink", () => {
  test("mounts properly when valid props are given", () => {
    const wrapper = factory({
      gqlType,
      jumpTypeCallback: jest.fn(),
    })

    expect(wrapper).toBeTruthy()
  })

  test("jumpToTypeCallback is called when the link is clicked", async () => {
    const callback = jest.fn()

    const wrapper = factory({
      gqlType,
      jumpTypeCallback: callback,
    })

    await wrapper.trigger("click")

    expect(callback).toHaveBeenCalledTimes(1)
  })

  test("jumpToType callback is not called if the root type is a scalar", async () => {
    const callback = jest.fn()

    const wrapper = factory({
      gqlType: GraphQLInt,
      jumpTypeCallback: callback,
    })

    await wrapper.trigger("click")

    expect(callback).not.toHaveBeenCalled()
  })

  test("link text is the type string", () => {
    const wrapper = factory({
      gqlType,
      jumpTypeCallback: jest.fn(),
    })

    expect(wrapper.text()).toBe("TestType")
  })
})
