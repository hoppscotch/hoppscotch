<template>
  <modal v-if="isModalVisible" ref="modal" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Memory Usage</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <canvas id="memoryLineChart" ref="memoryLineChart" style="height: 100%; width: 100%" />
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
import Chart from "chart.js"
export default {
  name: "memory_usage",
  props: {
    metricsDataObject: {},
    isModalVisible: Boolean,
  },
  updated() {
    this.generateMemoryUsageLineGraphPopUp()
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    generateMemoryUsageLineGraphPopUp() {
      const dataArr = []
      const labelArr = []
      let timeinMilis = 200
      for (let i = 0; i < this.metricsDataObject.Metricsets.length; i++) {
        const sampleArr = this.metricsDataObject.Metricsets[i].Samples
        for (let j = 0; j < sampleArr.length; j++) {
          if (sampleArr[j].Name === "system.process.memory.rss.bytes") {
            const value = sampleArr[j].Value / 1000
            dataArr.push(value.toFixed(2))
            labelArr.push(timeinMilis)
            timeinMilis += 200
          }
        }
      }
      this.showLineGraph(labelArr, dataArr, "Memory Consumption in KB")
    },
    showLineGraph(labelArr, dataArr, label) {
      const canvas = this.$refs.memoryLineChart

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
