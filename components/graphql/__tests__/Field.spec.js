import { shallowMount } from "@vue/test-utils"
import field from "../Field"

const gqlField = {
  name: "testField",
  args: [
    {
      name: "arg1",
      type: "Arg1Type",
    },
    {
      name: "arg2",
      type: "Arg2type",
    },
  ],
  type: "FieldType",
  description: "TestDescription",
}

const factory = (props) =>
  shallowMount(field, {
    propsData: props,
    stubs: {
      GraphqlTypeLink: {
        template: "<span>Typelink</span>",
      },
    },
    mocks: {
      $t: (text) => text,
    },
  })

describe("field", () => {
  test("mounts properly if props are given", () => {
    const wrapper = factory({
      gqlField,
    })

    expect(wrapper).toBeTruthy()
  })

  test("field title is set correctly for fields with no args", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        args: undefined,
      },
    })

    expect(
      wrapper
        .find(".field-title")
        .text()
        .replace(/[\r\n]+/g, "")
        .replace(/  +/g, " ")
    ).toEqual("testField : Typelink")
  })

  test("field title is correctly given for fields with single arg", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        args: [
          {
            name: "arg1",
            type: "Arg1Type",
          },
        ],
      },
    })

    expect(
      wrapper
        .find(".field-title")
        .text()
        .replace(/[\r\n]+/g, "")
        .replace(/  +/g, " ")
    ).toEqual("testField ( arg1: Typelink ) : Typelink")
  })

  test("field title is correctly given for fields with multiple args", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        args: [
          {
            name: "arg1",
            type: "Arg1Type",
          },
        ],
      },
    })

    expect(
      wrapper
        .find(".field-title")
        .text()
        .replace(/[\r\n]+/g, "")
        .replace(/  +/g, " ")
    ).toEqual("testField ( arg1: Typelink ) : Typelink")
  })

  test("all typelinks are passed the jump callback", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        args: [
          {
            name: "arg1",
            type: "Arg1Type",
          },
          {
            name: "arg2",
            type: "Arg2Type",
          },
        ],
      },
    })

    expect(
      wrapper
        .find(".field-title")
        .text()
        .replace(/[\r\n]+/g, "")
        .replace(/  +/g, " ")
    ).toEqual("testField ( arg1: Typelink , arg2: Typelink ) : Typelink")
  })

  test("description is rendered when it is present", () => {
    const wrapper = factory({
      gqlField,
    })

    expect(wrapper.find(".field-desc").text()).toEqual("TestDescription")
  })

  test("description not rendered when it is not present", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        description: undefined,
      },
    })

    expect(wrapper.find(".field-desc").exists()).toEqual(false)
  })

  test("deprecation warning is displayed when field is deprecated", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        isDeprecated: true,
      },
    })

    expect(wrapper.find(".field-deprecated").exists()).toEqual(true)
  })

  test("deprecation warning is not displayed wwhen field is not deprecated", () => {
    const wrapper = factory({
      gqlField: {
        ...gqlField,
        isDeprecated: false,
      },
    })

    expect(wrapper.find(".field-deprecated").exists()).toEqual(false)
  })
})
