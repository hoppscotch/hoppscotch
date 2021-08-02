import Item from "./Item.vue"

export default {
  component: Item,
  title: "Smart/Item",
}

const Template = (_args, { argTypes }) => ({
  components: { Item },
  props: Object.keys(argTypes),
  template: `<SmartItem v-bind="$props" v-on="$props" />`,
})

export const SmartItem = Template.bind({})
SmartItem.args = {
  label: "Item",
}
