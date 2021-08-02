import Toggle from "./Toggle.vue"

export default {
  component: Toggle,
  title: "Smart/Toggle",
}

const Template = (_args, { argTypes }) => ({
  components: { Toggle },
  props: Object.keys(argTypes),
  template: `<SmartToggle v-bind="$props" v-on="$props" />`,
})

export const SmartToggle = Template.bind({})
SmartToggle.args = {
  label: "Toggle",
  on: true,
}
