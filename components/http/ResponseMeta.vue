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
      <div class="flex space-x-2 pb-8">
        <div class="flex flex-col space-y-4 items-end">
          <span class="flex flex-1 items-center">{{ $t("send_request") }}</span>
          <span class="flex flex-1 items-center">{{
            $t("reset_request")
          }}</span>
          <span class="flex flex-1 items-center"> Show all Shortcuts </span>
        </div>
        <div class="flex flex-col space-y-4">
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">G</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">I</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">?</span>
          </div>
        </div>
      </div>
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
import { getPlatformSpecialKey } from "~/helpers/platformutils"

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
  methods: {
    getSpecialKey: getPlatformSpecialKey,
  },
}
</script>

<style lang="scss" scoped>
.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
