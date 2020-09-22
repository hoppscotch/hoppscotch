<template>
  <modal v-if="isModalVisible" ref="modal" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">CPU Usage</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <canvas id="cpuLineChart" ref="cpuLineChart" style="height: 100%; width: 100%" />
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
import Chart from "chart.js"
export default {
  name: "cpu_usage",
  props: {
    metricsDataObject: {},
    isModalVisible: Boolean,
  },
  updated() {
    this.generateCpuUsageLineGraphPopUp()
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    generateCpuUsageLineGraphPopUp() {
      const dataArr = []
      const labelArr = []
      let timeinMilis = 200
      for (let i = 0; i < this.metricsDataObject.Metricsets.length; i++) {
        const sampleArr = this.metricsDataObject.Metricsets[i].Samples
        for (let j = 0; j < sampleArr.length; j++) {
          if (sampleArr[j].Name === "system.process.cpu.system.norm.pct") {
            const value = sampleArr[j].Value * 100
            dataArr.push(value.toFixed(2))
            labelArr.push(timeinMilis)
            timeinMilis += 200
          }
        }
      }
      this.showLineGraph(labelArr, dataArr, "Cpu Consumption in %")
    },
    showLineGraph(labelArr, dataArr, label) {
      const canvas = this.$refs.cpuLineChart

      if (canvas === null || canvas === undefined) {
        return
      }

      const data = {
        labels: labelArr,
        datasets: [
          {
            label,
            data: dataArr,
            backgroundColor: "rgb(74,255,109)",
          },
        ],
      }
      const option = {
        responsive: false,
        scales: {
          yAxes: [
            {
              stacked: true,
              gridLines: {
                display: true,
                backgroundColor: "rgb(74,255,109)",
              },
            },
          ],
          xAxes: [
            {
              gridLines: {
                display: false,
              },
            },
          ],
        },
      }

      const myChart = Chart.Line(canvas, {
        data,
        options: option,
      })
    },
  },
  computed: {},
  components: {
    closeIcon,
  },
}
</script>

<style scoped></style>
