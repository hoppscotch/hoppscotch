<template>
  <modal v-if="isModalVisible" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Stack Trace</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div v-if="this.errorDataObject.Exception !== null">
        <h2>{{ this.errorDataObject.Exception.Message }}</h2>
        <h3>Library Frames</h3>
        <div v-for="obj in this.errorDataObject.Exception.Stacktrace" v-if="obj.LibraryFrame">
          {{ obj.Filename }} at {{ obj.Lineno }}
          <pre style="max-height: 400px; overflow: auto">
            <code style="color: #070907; background-color: #f8fff4;">{{obj.ContextLine}}</code>
          </pre>
        </div>
        <p style="margin-top: 80px">--End--</p>
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  name: "stacktrace",
  props: {
    errorDataObject: {},
    isModalVisible: Boolean,
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
  },
  components: {
    closeIcon,
  },
}
</script>

<style scoped></style>
