import Primary from "./Primary.vue"

export default {
  component: Primary,
  title: "Components/Tab",
}

const Template = (_args, { argTypes }) => ({
  components: { Primary },
  props: Object.keys(argTypes),
  template: `<TabPrimary v-bind="$props" v-on="$props" />`,
})

export const TabPrimary = Template.bind({})
TabPrimary.args = {
  label: "Primary",
}
