<template>
  <div class="flex items-center justify-between px-4 py-2">
    <div class="flex items-center">
      <i
        v-tippy="{ theme: 'tooltip' }"
        class="mr-4 material-icons cursor-help"
        :class="getStyle(status)"
        :title="`${t(getTooltip(status))}`"
      >
        {{ getIcon(status) }}
      </i>
      <span class="text-secondaryDark">
        {{ env.key }}
      </span>
      <span class="text-secondaryDark">
        {{ ` \xA0 — \xA0 ${env.value}` }}
      </span>
      <span v-if="status === 'updations'" class="text-secondaryLight">
        {{ ` \xA0 ← \xA0 ${env.previousValue}` }}
      </span>
    </div>
    <span
      v-if="global"
      class="px-1 rounded bg-accentLight text-accentContrast text-tiny"
    >
      Global
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/helpers/utils/composables"

type Status = "updations" | "additions" | "deletions"
type Props = {
  env: {
    key: string
    value: string
    previousValue?: string
  }
  status: Status
  global: boolean
}

withDefaults(defineProps<Props>(), {
  global: false,
})

const t = useI18n()

const getIcon = (status: Status) => {
  switch (status) {
    case "additions":
      return "add_circle"
    case "updations":
      return "check_circle"
    case "deletions":
      return "remove_circle"
  }
}

const getStyle = (status: Status) => {
  switch (status) {
    case "additions":
      return "text-green-500"
    case "updations":
      return "text-yellow-500"
    case "deletions":
      return "text-red-500"
  }
}

const getTooltip = (status: Status) => {
  switch (status) {
    case "additions":
      return "environment.added"
    case "updations":
      return "environment.updated"
    case "deletions":
      return "environment.deleted"
  }
}
</script>
