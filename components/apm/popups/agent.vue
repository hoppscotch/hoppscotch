<template>
  <modal v-if="isModalVisible" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Agent</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <p>Name : {{ this.transactionDataObject[0].Metadata.Service.Agent.Name }}</p>
        <p>Version : {{ this.transactionDataObject[0].Metadata.Service.Agent.Version }}</p>
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
export default {
  name: "agent",
  props: {
    transactionDataObject: {},
    isModalVisible: Boolean,
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
  },
  computed: {},
  components: {
    closeIcon,
  },
}
</script>

<style scoped></style>
