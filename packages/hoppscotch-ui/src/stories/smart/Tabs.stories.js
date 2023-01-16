import SmartTabs from "../../components/smart/Tabs.vue"

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: "Example/Tabs",
  component: SmartTabs,
}

// More on component templates: https://storybook.js.org/docs/vue/writing-stories/introduction#using-args
const Template = (args) => ({
  // Components used in your story `template` are defined in the `components` object
  components: { SmartTabs },
  // The story's `args` need to be mapped into the template through the `setup()` method
  setup() {
    return { args }
  },
  // And then the `args` are bound to your component with `v-bind="args"`
  template: `
  <SmartTabs
  render-inactive-tabs
>
  <SmartTab :id="'authorization'" :label="Authorization">
    <div>Authorization Content</div>
  </SmartTab>
  <SmartTab :id="'body'" :label="Body">
    <div>Body Content</div>
  </SmartTab>
</SmartTabs>
  `,
})

export const Default = Template.bind({})
