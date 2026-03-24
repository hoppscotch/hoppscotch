<template>
  <div class="group flex flex-col">
    <div class="flex items-center">
      <span
        v-tippy="{
          theme: 'tooltip',
          delay: [500, 20],
          content: entry.updatedOn ? shortDateTime(entry.updatedOn) : null,
        }"
        class="flex min-w-0 flex-1 cursor-pointer py-2 pl-4 pr-2 transition group-hover:text-secondaryDark"
        @click="emit('use-entry')"
      >
        <span class="truncate">
          {{ displayName }}
        </span>
      </span>
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="expand ? t('hide.more') : t('show.more')"
        :icon="expand ? IconMinimize2 : IconMaximize2"
        class="hidden group-hover:inline-flex"
        @click="expand = !expand"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.remove')"
        :icon="IconTrash"
        color="red"
        class="hidden group-hover:inline-flex"
        @click="emit('delete-entry')"
      />
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="!entry.star ? t('add.star') : t('remove.star')"
        :icon="entry.star ? IconStarOff : IconStar"
        color="yellow"
        :class="{ 'hidden group-hover:inline-flex': !entry.star }"
        @click="emit('toggle-star')"
      />
    </div>

    <div
      v-if="expand"
      class="space-y-1 px-4 pb-3 text-tiny text-secondaryLight"
    >
      <p>
        <span class="font-semibold">{{ t("mcp.transport") }}:</span>
        {{ entry.request.transportType }}
      </p>
      <p v-if="entry.request.method.methodType">
        <span class="font-semibold">{{ t("mcp.method_type") }}:</span>
        {{ entry.request.method.methodType }}
      </p>
      <p v-if="entry.request.method.methodName" class="truncate">
        <span class="font-semibold">{{ t("mcp.method_name") }}:</span>
        {{ entry.request.method.methodName }}
      </p>
      <p v-if="entry.request.httpConfig?.url" class="truncate">
        <span class="font-semibold">{{ t("mcp.url") }}:</span>
        {{ entry.request.httpConfig.url }}
      </p>
      <p v-if="entry.request.stdioConfig?.command" class="truncate">
        <span class="font-semibold">{{ t("mcp.command") }}:</span>
        {{ entry.request.stdioConfig.command }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconStar from "~icons/lucide/star"
import IconStarOff from "~icons/hopp/star-off"
import IconTrash from "~icons/lucide/trash"
import IconMinimize2 from "~icons/lucide/minimize-2"
import IconMaximize2 from "~icons/lucide/maximize-2"
import { useI18n } from "@composables/i18n"
import { shortDateTime } from "~/helpers/utils/date"
import { MCPHistoryEntry } from "~/newstore/history"

const props = defineProps<{
  entry: MCPHistoryEntry
}>()

const emit = defineEmits<{
  (e: "use-entry"): void
  (e: "delete-entry"): void
  (e: "toggle-star"): void
}>()

const t = useI18n()
const expand = ref(false)

const displayName = computed(() => {
  if (
    props.entry.request.name &&
    props.entry.request.name !== "Untitled MCP Request"
  ) {
    return props.entry.request.name
  }

  if (props.entry.request.method.methodName) {
    return props.entry.request.method.methodName
  }

  if (props.entry.request.httpConfig?.url) {
    return props.entry.request.httpConfig.url
  }

  if (props.entry.request.stdioConfig?.command) {
    return props.entry.request.stdioConfig.command
  }

  return t("mcp.short_title")
})
</script>
