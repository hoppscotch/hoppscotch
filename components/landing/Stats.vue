<template>
  <div class="flex p-4 font-mono space-x-16">
    <div v-for="(stat, index) in stats" :key="`stat-${index}`">
      <span class="text-xl font-bold">
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
