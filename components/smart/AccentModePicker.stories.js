import AccentModePicker from "./AccentModePicker.vue"

export default {
  component: AccentModePicker,
  title: "Smart/AccentModePicker",
}

const Template = (_args, { argTypes }) => ({
  components: { AccentModePicker },
  props: Object.keys(argTypes),
  template: `<SmartAccentModePicker v-bind="$props" v-on="$props" />`,
})

export const SmartAccentModePicker = Template.bind({})
SmartAccentModePicker.args = {}
