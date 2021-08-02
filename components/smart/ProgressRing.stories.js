import ProgressRing from "./ProgressRing.vue"

export default {
  component: ProgressRing,
  title: "Smart/ProgressRing",
}

const Template = (_args, { argTypes }) => ({
  components: { ProgressRing },
  props: Object.keys(argTypes),
  template: `<SmartProgressRing v-bind="$props" v-on="$props" />`,
})

export const SmartProgressRing = Template.bind({})
SmartProgressRing.args = {
  radius: 16,
  stroke: 4,
  progress: 25,
}
