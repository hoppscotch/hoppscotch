<template>
  <div class="flex flex-col">
    <label>{{ $t("response") }}</label>
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
  },
  computed: {
    statusCategory() {
      return findStatusGroup(this.response.status)
    },
  },
}
</script>
