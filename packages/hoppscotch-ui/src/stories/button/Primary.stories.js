import ButtonPrimary from "../../components/button/Primary.vue"

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: "Example/ButtonPrimary",
  component: ButtonPrimary,
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

export const Default = Template.bind({
  label: "Button",
})
Default.args = {
  label: "Button",
}
