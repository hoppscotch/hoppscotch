import { mount } from "@vue/test-utils"
import pwToggle from "../Toggle"

const factory = (props, slot) =>
  mount(pwToggle, {
    propsData: props,
    slots: {
      default: slot,
    },
  })

describe("pwToggle", () => {
  test("mounts properly", () => {
    const wrapper = factory({ on: true }, "test")

    expect(wrapper).toBeTruthy()
  })

  test("mounts even without the on prop", () => {
    const wrapper = factory({}, "test")

    expect(wrapper).toBeTruthy()
  })

  test("state is set correctly through the prop", () => {
    const wrapper1 = factory({ on: true }, "test")
    expect(wrapper1.vm.$refs.toggle.classList.contains("on")).toEqual(true)

    const wrapper2 = factory({ on: false }, "test")
    expect(wrapper2.vm.$refs.toggle.classList.contains("on")).toEqual(false)
  })

  test("caption label is rendered", () => {
    const wrapper = factory({ on: true }, "<span id='testcaption'></span>")

    expect(wrapper.find("#testcaption").exists()).toEqual(true)
  })

  test("clicking the button toggles the state", async () => {
    const wrapper = factory({ on: true }, "test")

    wrapper.vm.toggle()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.$refs.toggle.classList.contains("on")).toEqual(false)

    wrapper.vm.toggle()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.$refs.toggle.classList.contains("on")).toEqual(true)
  })
})
