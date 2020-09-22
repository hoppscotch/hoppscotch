<template>
  <modal v-if="isModalVisible" ref="modal" @close="hideModal">
    <div slot="header">
      <div class="flex-wrap">
        <h1 class="title">Waterfall</h1>
        <div>
          <button class="icon" @click="hideModal">
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
    <div slot="body">
      <div>
        <canvas id="barChart" ref="barChart" style="height: 100%; width: 100%" />
      </div>
    </div>
  </modal>
</template>

<script>
import closeIcon from "~/static/icons/close-24px.svg?inline"
import Chart from "chart.js"
export default {
  name: "waterfall",
  props: {
    transactionDataObject: {},
    isModalVisible: Boolean,
  },
  updated() {
    console.log(this.transactionDataObject)
    this.showBarGraph()
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    showBarGraph() {
      const canvas = this.$refs.barChart
      if (canvas === null || canvas === undefined) {
        return
      }
      const labelArr = []
      const dataArr = []

      let previousDuration = 0.0
      for (let i = 0; i < this.transactionDataObject.length; i++) {
        labelArr.push(this.transactionDataObject[i].Name)
        dataArr.push([previousDuration, previousDuration + this.transactionDataObject[i].Duration])
        if (i > 0) {
          previousDuration += this.transactionDataObject[i].Duration
        }
      }

      const data = {
        labels: labelArr,
        datasets: [
          {
            label: "Time taken by each query",
            data: dataArr,
            borderWidth: 1,
            backgroundColor: "rgb(74,255,109)",
          },
        ],
      }
      const options = {
        responsive: false,
        maintainAspectRatio: false,
        tooltips: {
          callbacks: {
            label(tooltipItem, data) {
              const unit = tooltipItem.index === 0 ? "ms" : "us"
              const temp = data.datasets[0].data[tooltipItem.index]
              return (temp[1] - temp[0]).toFixed(2).toString().concat(unit)
            },
          },
        },
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                fontSize: 5,
              },
            },
          ],
        },
      }

      const myBarChart = new Chart(canvas, {
        type: "horizontalBar",
        data,
        options,
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
