<template>
  <div
    style="margin-top: 20px"
    v-if="this.isTransactionDataReceived"
    v-model="transactionDataObject"
  >
    <li>Timestamp : {{ this.transactionDataObject[0].Timestamp }}</li>
    <li>Url : {{ transactionDataObject[0].URL.Full }}</li>
    <li>Duration : {{ transactionDataObject[0].Duration }}</li>
    <li>Result : {{ transactionDataObject[0].Result }}</li>
    <li>User id : {{ transactionDataObject[0].Metadata.User.ID }}</li>
    <div style="margin-top: 20px">
      <button @click="showMetadataModal" style="padding: 6px 0px; width: 100px; margin-left: 10px">
        Meta data
      </button>
      <button @click="showWaterfallModal" style="padding: 6px 0px; width: 100px; margin-left: 10px">
        Waterfall
      </button>
      <button @click="showServiceModal" style="padding: 6px 0px; width: 100px; margin-left: 10px">
        Service
      </button>
      <button @click="showProcessModal" style="padding: 6px 0px; width: 100px; margin-left: 10px">
        Process
      </button>
      <button
        @click="showAgentModal"
        style="padding: 6px 0px; width: 100px; margin-left: 10px; margin-top: 10px"
      >
        Agent
      </button>
      <button
        @click="showUserDataModal"
        style="padding: 6px 0px; width: 100px; margin-left: 10px; margin-top: 10px"
      >
        User
      </button>
    </div>
    <metadata
      :transactionDataObject="transactionDataObject"
      :isModalVisible="isMetadataModalVisible"
      @hide-modal="hideMetadataModal()"
    />
    <agent
      :transactionDataObject="transactionDataObject"
      :isModalVisible="isAgentModalVisible"
      @hide-modal="hideAgentModal()"
    />
    <process
      :transactionDataObject="transactionDataObject"
      :isModalVisible="isProcessModalVisible"
      @hide-modal="hideProcessModal()"
    />
    <service
      :transactionDataObject="transactionDataObject"
      :isModalVisible="isServiceModalVisible"
      @hide-modal="hideServiceModal()"
    />
    <userdata
      :transactionDataObject="transactionDataObject"
      :isModalVisible="isUserDataModalVisible"
      @hide-modal="hideUserDataModal()"
    />
    <waterfall
      :transactionDataObject="transactionDataObject"
      :isModalVisible="isWaterfallModalVisible"
      @hide-modal="hideWaterfallModal()"
    />
  </div>
  <div v-else>Data not received from apm</div>
</template>

<script>
import Metadata from "./popups/metadata"
import Agent from "./popups/agent"
import Process from "./popups/process"
import Service from "./popups/service"
import Waterfall from "./popups/waterfall"
import Userdata from "./popups/Userdata"
export default {
  name: "transaction",
  data() {
    return {
      transactionDataObject: {},
      isTransactionDataReceived: false,
      isMetadataModalVisible: false,
      isAgentModalVisible: false,
      isProcessModalVisible: false,
      isServiceModalVisible: false,
      isUserDataModalVisible: false,
      isWaterfallModalVisible: false,
    }
  },
  created() {
    this.fetchTransactions()
  },
  components: {
    Waterfall,
    Service,
    Process,
    Agent,
    Metadata,
    Userdata,
  },
  computed: {},
  methods: {
    async fetchTransactions() {
      const data = {
        url: `${this.$store.state.request.method.toUpperCase()}${
          this.$store.state.request.path
        }`.toString(),
      }
      const url = "http://0.0.0.0:8200/v1/transactions/get"
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
          this.transactionDataObject = JSON.parse(data.result)
          this.isTransactionDataReceived = true
          console.log(this.transactionDataObject)
        } else {
          this.isTransactionDataReceived = false
        }
      })
    },
    showMetadataModal() {
      this.isMetadataModalVisible = true
    },
    showAgentModal() {
      this.isAgentModalVisible = true
    },
    showServiceModal() {
      this.isServiceModalVisible = true
    },
    showUserDataModal() {
      this.isUserDataModalVisible = true
    },
    showWaterfallModal() {
      this.isWaterfallModalVisible = true
    },
    showProcessModal() {
      this.isProcessModalVisible = true
    },
    hideMetadataModal() {
      this.isMetadataModalVisible = false
    },
    hideAgentModal() {
      this.isAgentModalVisible = false
    },
    hideProcessModal() {
      this.isProcessModalVisible = false
    },
    hideServiceModal() {
      this.isServiceModalVisible = false
    },
    hideUserDataModal() {
      this.isUserDataModalVisible = false
    },
    hideWaterfallModal() {
      this.isWaterfallModalVisible = false
    },
  },
}
</script>

<style scoped></style>
