<template>
  <div v-if="isMetricsDataReceived" v-model="metricsDataObject">
    <h2>System & Process Stats</h2>
    <div style="margin-top: 20px">
      <button @click="showCpuUsageModal" style="padding: 6px 0px; width: 100px; margin-left: 20px">
        CPU Usage
      </button>
      <button
        @click="showMemoryUsageModal"
        style="padding: 6px 0px; width: 100px; margin-left: 20px"
      >
        Memory Usage
      </button>
    </div>
    <cpu-usage
      :metricsDataObject="metricsDataObject"
      :isModalVisible="isCpuUsageModalVisible"
      @hide-modal="hideCpuUsageModal()"
    />
    <memory-usage
      :metricsDataObject="metricsDataObject"
      :isModalVisible="isMemoryUsageModalVisible"
      @hide-modal="hideMemoryUsageModal()"
    />
  </div>
</template>

<script>
import CpuUsage from "./popups/cpu_usage"
import MemoryUsage from "./popups/memory_usage"

export default {
  name: "metrics",
  data() {
    return {
      metricsDataObject: {},
      isMetricsDataReceived: false,
      isCpuUsageModalVisible: false,
      isMemoryUsageModalVisible: false,
    }
  },
  created() {
    this.fetchMetrics()
  },
  components: {
    CpuUsage,
    MemoryUsage,
  },
  methods: {
    async fetchMetrics() {
      const data = {
        url: `${this.$store.state.request.method.toUpperCase()} ${
          this.$store.state.request.path
        }`.toString(),
      }
      const url = "http://0.0.0.0:8200/v1/metrics/get"
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
        this.metricsDataObject = JSON.parse(data.result)
        this.isMetricsDataReceived = true
        console.log(this.metricsDataObject)
      })
    },
    showCpuUsageModal() {
      this.isCpuUsageModalVisible = true
    },
    showMemoryUsageModal() {
      this.isMemoryUsageModalVisible = true
    },
    hideCpuUsageModal() {
      this.isCpuUsageModalVisible = false
    },
    hideMemoryUsageModal() {
      this.isMemoryUsageModalVisible = false
    },
  },
}
</script>

<style scoped></style>
