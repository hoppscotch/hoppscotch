import Picture from "./Picture.vue"

export default {
  component: Picture,
  title: "Components/Profile",
}

const Template = (_args, { argTypes }) => ({
  components: { Picture },
  props: Object.keys(argTypes),
  template: `<ProfilePicture v-bind="$props" v-on="$props" />`,
})

export const ProfilePicture = Template.bind({})
ProfilePicture.args = {}
