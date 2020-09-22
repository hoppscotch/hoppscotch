<template>
  <div v-if="isErrorDataReceived" v-model="errorDataObject">
    <ul>
      <li v-if="this.errorDataObject.Exception !== null">
        Exception message : {{ this.errorDataObject.Exception.Message }}
      </li>
      <li v-if="this.errorDataObject.Culprit !== null">
        Culprit : {{ this.errorDataObject.Culprit }}
      </li>
    </ul>
    <div style="margin-top: 20px">
      <button
        @click="showStackTraceModal"
        style="padding: 6px 0px; width: 100px; margin-left: 20px"
      >
        Stack trace
      </button>
    </div>
    <stacktrace
      :errorDataObject="errorDataObject"
      :isModalVisible="isStackTraceModalVisible"
      @hide-modal="hideStackTraceModal()"
    />
  </div>
</template>

<script>
import Stacktrace from "./popups/stacktrace"
export default {
  name: "error",
  components: { Stacktrace },
  data() {
    return {
      errorDataObject: {},
      isErrorDataReceived: false,
      isStackTraceModalVisible: false,
    }
  },
  created() {
    this.fetchErrorData()
  },
  methods: {
    async fetchErrorData() {
      const data = {
        url: this.$store.state.request.path,
      }
      const url = "http://0.0.0.0:8200/v1/error/get"
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
      })
      response.json().then((data) => {
        if (response.status === 202) {
          this.errorDataObject = JSON.parse(data.result)
          this.isErrorDataReceived = true
          console.log(this.errorDataObject)
        } else {
          this.isErrorDataReceived = false
        }
      })
    },
    showStackTraceModal() {
      this.isStackTraceModalVisible = true
    },
    hideStackTraceModal() {
      this.isStackTraceModalVisible = false
    },
  },
}
</script>

<style scoped></style>
