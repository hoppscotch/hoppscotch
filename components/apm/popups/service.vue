<template>
  <modal v-if="isModalVisible" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Service</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <p>Version : {{ this.transactionDataObject[0].Metadata.Service.Version }}</p>
        <p>Environment : {{ this.transactionDataObject[0].Metadata.Service.Environment }}</p>
        <p>Name : {{ this.transactionDataObject[0].Metadata.Service.Name }}</p>
        <h2>Runtime</h2>
        <ul>
          <li>Name : {{ this.transactionDataObject[0].Metadata.Service.Runtime.Name }}</li>
          <li>Version : {{ this.transactionDataObject[0].Metadata.Service.Runtime.Version }}</li>
        </ul>
        <h2>Framework</h2>
        <ul>
          <li>Name : {{ this.transactionDataObject[0].Metadata.Service.Framework.Name }}</li>
          <li>Version : {{ this.transactionDataObject[0].Metadata.Service.Framework.Version }}</li>
        </ul>
        <h2>Language</h2>
        <ul>
          <li>Name : {{ this.transactionDataObject[0].Metadata.Service.Language.Name }}</li>
          <li>Version : {{ this.transactionDataObject[0].Metadata.Service.Language.Version }}</li>
        </ul>
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
export default {
  name: "service",
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
