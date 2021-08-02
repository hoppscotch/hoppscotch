import AutoComplete from "./AutoComplete.vue"

export default {
  component: AutoComplete,
  title: "Smart/AutoComplete",
}

const Template = (_args, { argTypes }) => ({
  components: { AutoComplete },
  props: Object.keys(argTypes),
  template: `<SmartAutoComplete v-bind="$props" v-on="$props" />`,
})

export const SmartAutoComplete = Template.bind({})
SmartAutoComplete.args = {
  source: ["Apple", "Mango", "Carrot"],
}
