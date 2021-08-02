import DeletableChip from "./DeletableChip.vue"

export default {
  component: DeletableChip,
  title: "Smart/DeletableChip",
}

const Template = (_args, { argTypes }) => ({
  components: { DeletableChip },
  props: Object.keys(argTypes),
  template: `<SmartDeletableChip v-bind="$props" v-on="$props">file</DeletableChip>`,
})

export const SmartDeletableChip = Template.bind({})
SmartDeletableChip.args = {}
