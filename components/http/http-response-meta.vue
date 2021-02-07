<template>
  <div class="flex flex-col">
    <div class="flex items-center justify-between">
      <label>{{ $t("response") }}</label>
      <label v-if="active"><i class="animate-spin material-icons">refresh</i></label>
      <label v-else :class="statusCategory ? statusCategory.className : ''">
        <i class="material-icons">fiber_manual_record</i>
      </label>
    </div>
    <div class="flex flex-col lg:flex-row">
      <label class="flex-1">
        {{ $t("status") + `: \xA0 ` }}
        <span :class="statusCategory ? statusCategory.className : ''">
          {{ response.status || $t("waiting_send_req") }}
        </span>
      </label>
      <label>
        {{ $t("duration") + `: \xA0 ${response.duration} ms` }}
      </label>
      <label>
        {{ $t("size") + `: \xA0 ${response.size} B` }}
      </label>
    </div>
  </div>
</template>

<script>
import findStatusGroup from "~/helpers/findStatusGroup"

export default {
  props: {
    response: {
      type: Object,
      default: {},
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
