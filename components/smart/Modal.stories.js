import Modal from "./Modal.vue"

export default {
  component: Modal,
  title: "Smart/Modal",
}

const Template = (_args, { argTypes }) => ({
  components: { Modal },
  props: Object.keys(argTypes),
  template: `<SmartModal v-bind="$props" v-on="$props">
    <template #header>Header</template>
    <template #body><div class="px-2">Body</template>
    <template #footer>Footer</template>
    </SmartModal>`,
})

export const SmartModal = Template.bind({})
SmartModal.args = {}
