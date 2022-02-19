<template>
  <div class="flex items-center px-4 py-2">
    <i class="mr-4 material-icons" :class="getStyle(status)">
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
</template>

<script setup lang="ts">
type Status = "updations" | "additions" | "deletions"
type Props = {
  env: {
    key: string
    value: string
    previousValue?: string
  }
  status: Status
}

defineProps<Props>()

const getIcon = (status: Status) => {
  switch (status) {
    case "additions":
      return "add_circle_outline"
    case "updations":
      return "check_circle_outline"
    case "deletions":
      return "remove_circle_outline"
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
</script>
