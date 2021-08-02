import Spinner from "./Spinner.vue"

export default {
  component: Spinner,
  title: "Smart/Spinner",
}

const Template = (_args, { argTypes }) => ({
  components: { Spinner },
  props: Object.keys(argTypes),
  template: `<SmartSpinner v-bind="$props" v-on="$props" />`,
})

export const SmartSpinner = Template.bind({})
SmartSpinner.args = {}
