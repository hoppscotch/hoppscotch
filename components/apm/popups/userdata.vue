<template>
  <modal v-if="isModalVisible" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">User</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <li v-for="(key, value) in this.transactionDataObject[0].Metadata.User">
          {{ value }}: {{ key }}
        </li>
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
export default {
  name: "userdata",
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
