import GraphqlCard from "../graphql/Card"
import { mount } from "@vue/test-utils"

const factory = (props) => {
  return mount(GraphqlCard, {
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

const url = "https://dummydata.com"
const query = `query getUser($uid: String!) {
  user(uid: $uid) {
    name
  }
}`

describe("GraphqlCard", () => {
  test("Mounts properly if props are given", () => {
    const wrapper = factory({
      entry: {
        type: "graphql",
        url: url,
        query: query,
        star: false,
      },
    })
    expect(wrapper).toBeTruthy()
  })

  test("toggle-star emitted on clicking on star button", async () => {
    const wrapper = factory({
      entry: {
        type: "graphql",
        url: url,
        query: query,
        star: true,
      },
    })

    wrapper.find("button[data-testid='star_button']").trigger("click")
    expect(wrapper.emitted("toggle-star")).toBeTruthy()
  })

  test("query expands on clicking the show more button", async () => {
    const wrapper = factory({
      entry: {
        type: "graphql",
        url: url,
        query: query,
        star: true,
      },
    })
    expect(wrapper.vm.query).toStrictEqual([
      `query getUser($uid: String!) {`,
      `  user(uid: $uid) {`,
      `...`,
    ])
    await wrapper.find("button[data-testid='query_expand']").trigger("click")
    expect(wrapper.vm.query).toStrictEqual([
      `query getUser($uid: String!) {`,
      `  user(uid: $uid) {`,
      `    name`,
      `  }`,
      `}`,
    ])
  })

  test("use-entry emit on clicking the restore button", async () => {
    const wrapper = factory({
      entry: {
        type: "graphql",
        url: url,
        query: query,
        star: true,
      },
    })
    await wrapper.find("button[data-testid='restore_history_entry']").trigger("click")
    expect(wrapper.emitted("use-entry")).toBeTruthy()
  })

  test("delete-entry emit on clicking the delete button", async () => {
    const wrapper = factory({
      entry: {
        type: "graphql",
        url: url,
        query: query,
        star: true,
      },
    })
    await wrapper.find("button[data-testid=delete_history_entry]").trigger("click")
    expect(wrapper.emitted("delete-entry")).toBeTruthy()
  })
})
