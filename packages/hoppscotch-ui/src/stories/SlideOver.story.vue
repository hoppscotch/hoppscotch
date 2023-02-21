<template>
  <Story title="Slider Over">
    <HoppSmartSlideOver :show="show" :title="'Title'" @close="show = false">
      <template #content>
        <h1>Content</h1>
      </template>
    </HoppSmartSlideOver>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartSlideOver } from "../components/smart"
import { ref } from "vue"

const show = ref(true)
</script>
