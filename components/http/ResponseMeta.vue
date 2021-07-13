<template>
  <div
    class="
      flex
      sticky
      top-0
      z-10
      bg-primary
      items-center
      p-4
      font-mono font-semibold
      space-x-8
    "
  >
    <i v-if="response.type === 'loading'" class="animate-spin material-icons"
      >refresh</i
    >
    <span v-else>
      <span class="text-secondaryDark"> Status: </span>
      {{ response.statusCode || $t("waiting_send_req") }}
    </span>
    <span class="text-xs">
      <span class="text-secondaryDark"> Time: </span>
      {{ `${response.meta.responseDuration} ms` }}
    </span>
    <span class="text-xs">
      <span class="text-secondaryDark"> Size: </span>
      {{ `${response.meta.responseSize} B` }}
    </span>
  </div>
</template>

<script>
import findStatusGroup from "~/helpers/findStatusGroup"

export default {
  props: {
    response: {
      type: Object,
      default: () => {},
    },
  },
  computed: {
    statusCategory() {
      return findStatusGroup(this.response.statusCode)
    },
  },
}
</script>
