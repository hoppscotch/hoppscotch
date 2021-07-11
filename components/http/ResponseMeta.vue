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
    :class="statusCategory ? statusCategory.className : ''"
  >
    <i v-if="active" class="animate-spin material-icons">refresh</i>
    <span v-else>
      <span class="text-secondaryDark"> Status: </span>
      {{ response.status || $t("waiting_send_req") }}
    </span>
    <span v-if="response.duration" class="text-xs">
      <span class="text-secondaryDark"> Time: </span>
      {{ `${response.duration} ms` }}
    </span>
    <span v-if="response.size" class="text-xs">
      <span class="text-secondaryDark"> Size: </span>
      {{ `${response.size} B` }}
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
    active: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    statusCategory() {
      return findStatusGroup(this.response.status)
    },
  },
}
</script>
