import EnvInput from "./EnvInput.vue"

export default {
  component: EnvInput,
  title: "Smart/EnvInput",
}

const Template = (_args, { argTypes }) => ({
  components: { EnvInput },
  props: Object.keys(argTypes),
  template: `<SmartEnvInput v-bind="$props" v-on="$props" class="h-8 w-8" />`,
})

export const SmartEnvInput = Template.bind({})
SmartEnvInput.args = {
  placeholder: "<<env_var>>",
  value: "<<url>>/<<path>>",
}
