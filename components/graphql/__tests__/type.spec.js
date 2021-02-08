import type from "../type"

import { shallowMount } from "@vue/test-utils"

const gqlType = {
  name: "TestType",
  description: "TestDescription",
  getFields: () => [{ name: "field1" }, { name: "field2" }],
}

const factory = (props) =>
  shallowMount(type, {
    mocks: {
      $t: (text) => text,
    },
    propsData: { gqlTypes: [], ...props },
    stubs: ["field"],
  })

describe("type", () => {
  test("mounts properly when props are passed", () => {
    const wrapper = factory({
      gqlType,
    })

    expect(wrapper).toBeTruthy()
  })

  test("title of the type is rendered properly", () => {
    const wrapper = factory({
      gqlType,
    })

    expect(wrapper.find(".type-title").text()).toEqual("TestType")
  })

  test("description of the type is rendered properly if present", () => {
    const wrapper = factory({
      gqlType,
    })

    expect(wrapper.find(".type-desc").text()).toEqual("TestDescription")
  })

  test("description of the type is not rendered if not present", () => {
    const wrapper = factory({
      gqlType: {
        ...gqlType,
        description: undefined,
      },
    })

    expect(wrapper.find(".type-desc").exists()).toEqual(false)
  })

  test("fields are not rendered if not present", () => {
    const wrapper = factory({
      gqlType: {
        ...gqlType,
        getFields: undefined,
      },
    })
    expect(wrapper.find("field-stub").exists()).toEqual(false)
  })

  test("all fields are rendered if present with props passed properly", () => {
    const wrapper = factory({
      gqlType: {
        ...gqlType,
      },
    })

    expect(wrapper.findAll("field-stub").length).toEqual(2)
  })
})
