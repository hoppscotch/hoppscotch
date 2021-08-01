<template>
  <div class="bg-primary flex p-4 top-0 z-10 sticky items-center">
    <div
      v-if="response == null"
      class="
        flex flex-col flex-1
        text-secondaryLight
        items-center
        justify-center
      "
    >
      <i class="opacity-75 pb-2 material-icons">send</i>
      <span class="text-center pb-4">
        {{ $t("waiting_send_req") }}
      </span>
      <ButtonSecondary
        :label="$t('documentation')"
        to="https://docs.hoppscotch.io"
        blank
        outline
      />
    </div>
    <div v-else>
      <i v-if="response.type === 'loading'" class="animate-spin material-icons">
        refresh
      </i>
      <div
        v-else
        :class="statusCategory.className"
        class="font-mono font-semibold space-x-4"
      >
        <span v-if="response.statusCode">
          <span class="text-secondaryDark"> Status: </span>
          {{ response.statusCode || $t("waiting_send_req") }}
        </span>
        <span v-if="response.meta && response.meta.responseDuration">
          <span class="text-secondaryDark"> Time: </span>
          {{ `${response.meta.responseDuration} ms` }}
        </span>
        <span v-if="response.meta && response.meta.responseSize">
          <span class="text-secondaryDark"> Size: </span>
          {{ `${response.meta.responseSize} B` }}
        </span>
      </div>
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
