import { mount } from "@vue/test-utils"
import tab from "../Tab"

const factory = (props, data) => {
  if (data) {
    return mount(tab, {
      propsData: props,
      data: () => data,
      slots: {
        default: '<div id="testdiv"></div>',
      },
    })
  } else {
    return mount(tab, {
      propsData: props,
      slots: {
        default: '<div id="testdiv"></div>',
      },
    })
  }
}

describe("tab", () => {
  test("mounts properly when needed props are passed in", () => {
    const wrapper = factory({
      label: "TestLabel",
      icon: "TestIcon",
      id: "testid",
      selected: true,
    })

    expect(wrapper).toBeTruthy()
  })

  test("mounts properly when selected prop is not passed", () => {
    const wrapper = factory({
      label: "TestLabel",
      icon: "TestIcon",
      id: "testid",
    })

    expect(wrapper).toBeTruthy()
  })

  test("if 'selected' prop is not passed, it is set to false by default", () => {
    const wrapper = factory({
      label: "TestLabel",
      icon: "TestIcon",
      id: "testid",
    })

    expect(wrapper.props("selected")).toEqual(false)
  })

  test("if set active, the slot is shown", () => {
    const wrapper = factory(
      {
        label: "TestLabel",
        icon: "TestIcon",
        id: "testid",
        selected: true,
      },
      {
        isActive: true,
      }
    )

    expect(wrapper.find("#testdiv").isVisible()).toEqual(true)
  })

  test("if not set active, the slot is not rendered", () => {
    const wrapper = factory(
      {
        label: "TestLabel",
        icon: "TestIcon",
        id: "testid",
      },
      {
        isActive: false,
      }
    )

    expect(wrapper.find("#testdiv").isVisible()).toEqual(false)
  })
})
