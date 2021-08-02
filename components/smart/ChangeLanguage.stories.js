import ChangeLanguage from "./ChangeLanguage.vue"

export default {
  component: ChangeLanguage,
  title: "Smart/ChangeLanguage",
}

const Template = (_args, { argTypes }) => ({
  components: { ChangeLanguage },
  props: Object.keys(argTypes),
  template: `<SmartChangeLanguage v-bind="$props" v-on="$props" />`,
})

export const SmartChangeLanguage = Template.bind({})
SmartChangeLanguage.args = {}
