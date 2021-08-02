import Icon from "./Icon.vue"

export default {
  component: Icon,
  title: "Smart/Icon",
}

const Template = (_args, { argTypes }) => ({
  components: { Icon },
  props: Object.keys(argTypes),
  template: `<SmartIcon v-bind="$props" v-on="$props" class="h-8 w-8" />`,
})

export const SmartIcon = Template.bind({})
SmartIcon.args = {
  name: "github",
}
