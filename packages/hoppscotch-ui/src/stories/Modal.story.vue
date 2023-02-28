<template>
  <Story title="Modal">
    <HoppSmartModal :show="show" :title="'Modal Title'" @hide-modal="show = false" @resolve="resolveConfirmModal" />
  </Story>
</template>

<script lang="ts" setup>
import { HoppSmartModal } from "../components/smart"
import { ref } from "vue"

const show = ref(true)

const resolveConfirmModal = (resolve: string | null) => {
  alert("resolved: " + resolve)
  show.value = false
}
</script>
