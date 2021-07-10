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
      space-x-4
    "
    :class="statusCategory ? statusCategory.className : ''"
  >
    <i v-if="active" class="animate-spin material-icons">refresh</i>
    <span v-else>
      {{ response.status }}
    </span>
    <span v-if="response.duration" class="text-xs">
      {{ `${response.duration} ms` }}
    </span>
    <span v-if="response.size" class="text-xs">
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
