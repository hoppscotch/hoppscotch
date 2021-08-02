import Primary from "./Primary.vue"

export default {
  component: Primary,
  title: "Components/Button",
}

const Template = (_args, { argTypes }) => ({
  components: { Primary },
  props: Object.keys(argTypes),
  template: `<ButtonPrimary v-bind="$props" v-on="$props" />`,
})

export const ButtonPrimary = Template.bind({})
ButtonPrimary.args = {
  label: "Primary",
}
