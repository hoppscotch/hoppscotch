<template>
  <modal v-if="isModalVisible" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Metadata</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div v-model="transactionDataObject">
        <h1>Http</h1>
        <h3 v-if="this.transactionDataObject[0].HTTP.Request.Cookies != null">Cookies</h3>
        <li v-for="(key, value) in this.transactionDataObject[0].HTTP.Request.Cookies">
          {{ value }}: {{ key }}
        </li>
        <h3 v-if="this.transactionDataObject[0].HTTP.Request.Env != null">Environment</h3>
        <li v-for="(key, value) in this.transactionDataObject[0].HTTP.Request.Env">
          {{ value }}: {{ key }}
        </li>
        <h3>Headers</h3>
        <li v-for="(key, value) in this.transactionDataObject[0].HTTP.Request.Headers">
          {{ value }}: {{ key }}
        </li>
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
export default {
  name: "metadata",
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
