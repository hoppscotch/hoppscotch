<template>
  <div class="flex space-x-16 p-6">
    <div v-for="(stat, index) in stats" :key="`stat-${index}`">
      <span class="text-xl">
        {{ stat.count }}<span class="text-secondaryLight">+</span>
      </span>
      <br />
      <span class="text-sm">
        {{ stat.audience }}
      </span>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  data() {
    return {
      stats: [
        { count: "350k", audience: "Developers" },
        { count: "5k", audience: "Organizations" },
        { count: "1m", audience: "Requests" },
      ],
    }
  },
})
</script>
