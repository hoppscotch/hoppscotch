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
    <i v-if="response.type === 'loading'" class="animate-spin material-icons">
      refresh
    </i>
    <div v-else :class="statusCategory.className">
      <span v-if="response.statusCode">
        <span class="text-secondaryDark"> Status: </span>
        {{ response.statusCode || $t("waiting_send_req") }}
      </span>
      <span v-if="response.meta.responseDuration" class="text-xs">
        <span class="text-secondaryDark"> Time: </span>
        {{ `${response.meta.responseDuration} ms` }}
      </span>
      <span v-if="response.meta.responseSize" class="text-xs">
        <span class="text-secondaryDark"> Size: </span>
        {{ `${response.meta.responseSize} B` }}
      </span>
    </div>
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
