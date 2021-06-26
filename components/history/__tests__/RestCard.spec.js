import { mount } from "@vue/test-utils"
import RestCard from "../rest/Card"

const factory = (props) => {
  return mount(RestCard, {
    propsData: props,
    stubs: {
      "v-popover": {
        template: "<div><slot /><slot name='popover' :is-open=true /></div>",
      },
    },
    mocks: {
      $t: (text) => text,
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

const url = "https://dummydata.com/get"
const entry = {
  type: "rest",
  url,
  method: "GET",
  status: 200,
  star: false,
}
describe("RestCard", () => {
  test("Mounts properly if props are given", () => {
    const wrapper = factory({ entry })
    expect(wrapper).toBeTruthy()
  })

  test("toggle-star emitted on clicking on star button", () => {
    const wrapper = factory({ entry })

    wrapper.find("button[data-testid='star_button']").trigger("click")
    expect(wrapper.emitted("toggle-star")).toBeTruthy()
  })

  test("use-entry emit on clicking the restore button", async () => {
    const wrapper = factory({ entry })
    await wrapper
      .find("button[data-testid='restore_history_entry']")
      .trigger("click")
    expect(wrapper.emitted("use-entry")).toBeTruthy()
  })

  test("delete-entry emit on clicking the delete button", async () => {
    const wrapper = factory({ entry })
    await wrapper
      .find("button[data-testid=delete_history_entry]")
      .trigger("click")
    expect(wrapper.emitted("delete-entry")).toBeTruthy()
  })
})
