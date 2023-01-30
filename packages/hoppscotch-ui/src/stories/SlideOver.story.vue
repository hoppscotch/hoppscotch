<template>
  <Story title="Slider Over">
    <SmartSlideOver :show="show" :title="'Title'" @close="show = false">
      <template #content>
        <h1>Content</h1>
      </template>
    </SmartSlideOver>
  </Story>
</template>

<script lang="ts" setup>
import { ref } from "vue"

const show = ref(true)
</script>
