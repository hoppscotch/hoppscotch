import { mount } from "@vue/test-utils"
import autocomplete from "../AutoComplete"

const props = {
  placeholder: "",
  value: "",
  spellcheck: false,
  source: ["app", "apple", "appliance", "brian", "bob", "alice"],
}

// ["pp", "pple", "ppliance", "lice"]
const suggestionStr = props.source
  .filter((str) => str.startsWith("a"))
  .map((str) => str.slice(1))

const factory = (props) =>
  mount(autocomplete, {
    propsData: props,
  })

describe("autocomplete", () => {
  test("mounts properly", () => {
    const wrapper = factory(props)

    expect(wrapper).toBeTruthy()
  })

  test("emits input event on text update [v-model compat]", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("testval")

    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("input")).toBeTruthy()
    expect(wrapper.emitted("input").length).toEqual(1)
  })

  test("shows matching suggestions", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    const suggestions = wrapper.findAll("li").wrappers.map((el) => el.text())

    suggestionStr.forEach((str) => expect(suggestions).toContain(str))
  })

  test("doesnt show non-matching suggestions", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("b")
    await wrapper.vm.$nextTick()

    const suggestions = wrapper.findAll("li").wrappers.map((el) => el.text())

    suggestionStr.forEach((str) => expect(suggestions).not.toContain(str))
  })

  test("updates suggestions on input", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("b")
    await wrapper.vm.$nextTick()

    const suggestions = wrapper.findAll("li").wrappers.map((el) => el.text())

    suggestionStr.forEach((str) => expect(suggestions).not.toContain(str))
  })

  test("applies suggestion on clicking", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("b")
    await wrapper.vm.$nextTick()

    const selectedSuggestion = wrapper.findAll("li").at(0)
    const selectedText = selectedSuggestion.text()

    await selectedSuggestion.trigger("click")
    await wrapper.vm.$nextTick()

    expect(input.element.value).toEqual(`b${selectedText}`)
  })

  test("hide selection on pressing ESC", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("b")
    await wrapper.vm.$nextTick()

    await input.trigger("keyup", { code: "Escape" })
    await wrapper.vm.$nextTick()

    expect(wrapper.find("ul").exists()).toEqual(false)
  })

  test("pressing up when nothing is selected selects the first in the list", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowUp",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(0).element.classList.contains("active")
    ).toEqual(true)
  })

  test("pressing down arrow when nothing is selected selects the first in the list", async () => {
    const wrapper = factory(props)

    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(0).element.classList.contains("active")
    ).toEqual(true)
  })

  test("pressing down arrow moves down the selection list", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(1).element.classList.contains("active")
    ).toEqual(true)
  })

  test("pressing up arrow moves up the selection list", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowUp",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(0).element.classList.contains("active")
    ).toEqual(true)
  })

  test("pressing down arrow at the end of the list doesn't update the selection", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("b")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(1).element.classList.contains("active")
    ).toEqual(true)

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(1).element.classList.contains("active")
    ).toEqual(true)
  })

  test("pressing up arrow at the top of the list doesn't update the selection", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("b")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowUp",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(0).element.classList.contains("active")
    ).toEqual(true)

    await input.trigger("keydown", {
      code: "ArrowUp",
    })
    await wrapper.vm.$nextTick()

    expect(
      wrapper.findAll("li").at(0).element.classList.contains("active")
    ).toEqual(true)
  })

  test("pressing tab performs the current completion", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    const selectedSuggestion = wrapper.find("li.active").text()

    await input.trigger("keydown", {
      code: "Tab",
    })
    await wrapper.vm.$nextTick()

    expect(input.element.value).toEqual(`a${selectedSuggestion}`)
  })

  test("pressing tab when nothing is selected selects the first suggestion", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    const firstSuggestionText = wrapper.findAll("li").at(0).text()

    await input.trigger("keydown", {
      code: "Tab",
    })
    await wrapper.vm.$nextTick()

    expect(input.element.value).toEqual(`a${firstSuggestionText}`)
  })

  test("pressing any non-special key doesn't do anything", async () => {
    const wrapper = factory(props)
    const input = wrapper.find("input")

    await input.setValue("a")
    await wrapper.vm.$nextTick()

    await input.trigger("keydown", {
      code: "ArrowDown",
    })
    await wrapper.vm.$nextTick()

    const selectedSuggestion = wrapper.find("li.active").text()

    await input.trigger("keydown", {
      code: "Tab",
    })
    await wrapper.vm.$nextTick()

    expect(input.element.value).toEqual(`a${selectedSuggestion}`)
  })
})
