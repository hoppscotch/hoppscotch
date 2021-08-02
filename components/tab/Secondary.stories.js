import Secondary from "./Secondary.vue"

export default {
  component: Secondary,
  title: "Components/Tab",
}

const Template = (_args, { argTypes }) => ({
  components: { Secondary },
  props: Object.keys(argTypes),
  template: `<TabSecondary v-bind="$props" v-on="$props" />`,
})

export const TabSecondary = Template.bind({})
TabSecondary.args = {
  label: "Secondary",
}
