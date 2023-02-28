<template>
  <Story title="Toggle">
    <HoppSmartToggle :on="on" @change="change"> Turn on </HoppSmartToggle>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartToggle } from "../components/smart"
import { ref } from "vue"

const on = ref(true)

const change = () => {
  alert("changed to: " + on.value)
}
</script>
