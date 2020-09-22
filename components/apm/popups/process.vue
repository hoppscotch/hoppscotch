<template>
  <modal v-if="isModalVisible" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Process</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <p>pid : {{ this.transactionDataObject[0].Metadata.Process.Pid }}</p>
        <p>ppid : {{ this.transactionDataObject[0].Metadata.Process.Ppid }}</p>
        <p>title : {{ this.transactionDataObject[0].Metadata.Process.Title }}</p>
        <h2>Arguments</h2>
        <li v-for="arg in this.transactionDataObject[0].Metadata.Process.Argv">
          {{ arg }}
        </li>
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
export default {
  name: "process",
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
