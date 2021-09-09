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
      <div class="flex space-x-2 pb-4">
        <div class="flex flex-col space-y-4 items-end">
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.request.send_request") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.general.show_all") }}
          </span>
          <!-- <span class="flex flex-1 items-center">
            {{ $t("shortcut.general.command_menu") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.general.help_menu") }}
          </span> -->
        </div>
        <div class="flex flex-col space-y-4">
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">G</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">K</span>
          </div>
          <!-- <div class="flex">
            <span class="shortcut-key">/</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">?</span>
          </div> -->
        </div>
      </div>
      <ButtonSecondary
        :label="$t('app.documentation')"
        to="https://docs.hoppscotch.io"
        svg="external-link"
        blank
        outline
        reverse
      />
    </div>
    <div v-else class="flex flex-col flex-1">
      <div v-if="response.type === 'loading'">
        <i class="animate-spin material-icons"> refresh </i>
      </div>
      <div
        v-if="response.type === 'network_fail'"
        class="
          flex flex-col flex-1
          text-secondaryLight
          p-4
          items-center
          justify-center
        "
      >
        <i class="opacity-75 pb-2 material-icons">cloud_off</i>
        <span class="text-center pb-2">
          {{ $t("error.network_fail") }}
        </span>
        <span class="text-center pb-4">
          {{ $t("helpers.network_fail") }}
        </span>
        <ButtonSecondary
          outline
          :label="$t('action.learn_more')"
          to="https://docs.hoppscotch.io"
          blank
          svg="external-link"
          reverse
        />
      </div>
      <div
        v-if="response.type === 'success' || 'fail'"
        :class="statusCategory.className"
        class="font-semibold space-x-4"
      >
        <span v-if="response.statusCode">
          <span class="text-secondary"> {{ $t("response.status") }}: </span>
          {{ response.statusCode || $t("state.waiting_send_request") }}
        </span>
        <span v-if="response.meta && response.meta.responseDuration">
          <span class="text-secondary"> {{ $t("response.time") }}: </span>
          {{ `${response.meta.responseDuration} ms` }}
        </span>
        <span v-if="response.meta && response.meta.responseSize">
          <span class="text-secondary"> {{ $t("response.size") }}: </span>
          {{ `${response.meta.responseSize} B` }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import findStatusGroup from "~/helpers/findStatusGroup"
import { getPlatformSpecialKey } from "~/helpers/platformutils"

export default defineComponent({
  props: {
    response: {
      type: Object,
      default: () => null,
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
})
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
