import ButtonPrimary from "../components/button/Primary.vue"

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: "Example/ButtonPrimary",
  component: ButtonPrimary,
  // More on argTypes: https://storybook.js.org/docs/vue/api/argtypes
  argTypes: {
    to: { control: { type: "text" } },
    exact: { control: { type: "boolean" } },
    blank: { control: { type: "boolean" } },
    label: { control: { type: "text" } },
    color: { control: { type: "text" } },
    disabled: { control: { type: "boolean" } },
    loading: { control: { type: "boolean" } },
    large: { control: { type: "boolean" } },
    shadow: { control: { type: "boolean" } },
    reverse: { control: { type: "boolean" } },
    rounded: { control: { type: "boolean" } },
    gradient: { control: { type: "boolean" } },
    outline: { control: { type: "boolean" } },
  },
}

// More on component templates: https://storybook.js.org/docs/vue/writing-stories/introduction#using-args
const Template = (args) => ({
  // Components used in your story `template` are defined in the `components` object
  components: { ButtonPrimary },
  // The story's `args` need to be mapped into the template through the `setup()` method
  setup() {
    return { args }
  },
  // And then the `args` are bound to your component with `v-bind="args"`
  template: `
  <ButtonPrimary :label="Button"/>
  `,
})

export const Primary = Template.bind({})
// More on args: https://storybook.js.org/docs/vue/writing-stories/args
Primary.args = {
  label: "Button",
}

// export const Secondary = Template.bind({})
// Secondary.args = {
//   label: "Button",
// }

// export const Large = Template.bind({})
// Large.args = {
//   size: "large",
//   label: "Button",
// }

// export const Small = Template.bind({})
// Small.args = {
//   size: "small",
//   label: "Button",
// }
