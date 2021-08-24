<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-lowerSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("request.header_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="headers"
          ref="copyHeaders"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.copy')"
          :icon="copyIcon"
          @click.native="copyHeaders"
        />
      </div>
    </div>
    <div
      v-for="(header, index) in headers"
      :key="`header-${index}`"
      class="
        divide-x divide-dividerLight
        border-b border-dividerLight
        flex
        group
      "
    >
      <span
        class="
          flex flex-1
          min-w-0
          py-2
          px-4
          transition
          group-hover:text-secondaryDark
        "
      >
        <span class="rounded select-all truncate">
          {{ header.key }}
        </span>
      </span>
      <span
        class="
          flex flex-1
          min-w-0
          py-2
          px-4
          transition
          group-hover:text-secondaryDark
        "
      >
        <span class="rounded select-all truncate">
          {{ header.value }}
        </span>
      </span>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { copyToClipboard } from "~/helpers/utils/clipboard"

export default defineComponent({
  props: {
    headers: { type: Array, default: () => [] },
  },
  data() {
    return {
      copyIcon: "content_copy",
    }
  },
  methods: {
    copyHeaders() {
      copyToClipboard(JSON.stringify(this.headers))
      this.copyIcon = "done"
      this.$toast.success(this.$t("state.copied_to_clipboard"), {
        icon: "content_paste",
      })
      setTimeout(() => (this.copyIcon = "content_copy"), 1000)
    },
  },
})
</script>
