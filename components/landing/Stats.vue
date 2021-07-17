<template>
  <div class="flex font-mono space-x-16 p-4">
    <div v-for="(stat, index) in stats" :key="`stat-${index}`">
      <span class="font-bold text-xl">
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
export default {
  data() {
    return {
      stats: [
        { count: "350k", audience: "Developers" },
        { count: "10k", audience: "Organizations" },
        { count: "1m", audience: "Requests" },
      ],
    }
  },
}
</script>
