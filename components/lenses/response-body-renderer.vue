<template>
  <div>
    <tabs>
      <tab
        v-for="(lens, index) in validLenses"
        :key="lens.lensName"
        :id="lens.lensName"
        :label="lens.lensName"
        :selected="index === 0"
      >
        <component :is="lens.renderer" :response="response" />
      </tab>
      <tab
        v-if="Object.keys(response.headers).length !== 0"
        id="headers"
        :label="`Headers \xA0 • \xA0 ${Object.keys(response.headers).length}`"
      >
        <headers :headers="response.headers" />
      </tab>
      <tab id="metrics" label="Metrics">
        <metrics />
      </tab>
      <tab id="errors" label="Errors">
        <error />
      </tab>
      <tab id="transactions" label="Transactions">
        <transaction />
      </tab>
    </tabs>
  </div>
</template>

<script>
import { getSuitableLenses, getLensRenderers } from "~/helpers/lenses/lenses"
import Transaction from "../apm/transaction"
import Metrics from "../apm/metrics"
import Error from "../apm/error"

export default {
  components: {
    Error,
    Metrics,
    Transaction,
    // Lens Renderers
    ...getLensRenderers(),
  },
  props: {
    response: {},
  },
  computed: {
    validLenses() {
      return getSuitableLenses(this.response)
    },
  },
}
</script>
