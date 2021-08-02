import Anchor from "./Anchor.vue"

export default {
  component: Anchor,
  title: "Smart/Anchor",
}

const Template = (_args, { argTypes }) => ({
  components: { Anchor },
  props: Object.keys(argTypes),
  template: `<SmartAnchor v-bind="$props" v-on="$props" />`,
})

export const SmartAnchor = Template.bind({})
SmartAnchor.args = {
  label: "Link",
}
