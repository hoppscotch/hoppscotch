<template>
  <Story title="Modal">
    <SmartModal
      :show="show"
      :title="'Modal Title'"
      @hide-modal="show = false"
      @resolve="resolveConfirmModal"
    />
  </Story>
</template>

<script lang="ts" setup>
import { ref } from "vue"

const show = ref(true)

const resolveConfirmModal = (resolve: string | null) => {
  alert("resolved: " + resolve)
  show.value = false
}
</script>
