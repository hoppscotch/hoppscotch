import ColorModePicker from "./ColorModePicker.vue"

export default {
  component: ColorModePicker,
  title: "Smart/ColorModePicker",
}

const Template = (_args, { argTypes }) => ({
  components: { ColorModePicker },
  props: Object.keys(argTypes),
  template: `<SmartColorModePicker v-bind="$props" v-on="$props" />`,
})

export const SmartColorModePicker = Template.bind({})
SmartColorModePicker.args = {}
