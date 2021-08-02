import Secondary from "./Secondary.vue"

export default {
  component: Secondary,
  title: "Components/Button",
}

const Template = (_args, { argTypes }) => ({
  components: { Secondary },
  props: Object.keys(argTypes),
  template: `<ButtonSecondary v-bind="$props" v-on="$props" />`,
})

export const ButtonSecondary = Template.bind({})
ButtonSecondary.args = {
  label: "Secondary",
}
