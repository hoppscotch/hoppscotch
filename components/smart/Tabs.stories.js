import Tabs from "./Tabs.vue"

export default {
  component: Tabs,
  title: "Smart/Tabs",
}

const Template = (_args, { argTypes }) => ({
  components: { Tabs },
  props: Object.keys(argTypes),
  template:
    '<SmartTabs v-bind="$props" v-on="$props"><SmartTab selected label="Tab 1"></SmartTab></SmartTabs>',
})

export const SmartTabs = Template.bind({})
SmartTabs.args = {}
