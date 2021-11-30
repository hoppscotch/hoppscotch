<script setup lang="ts">
// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
useHead({
  title: "Hoppscotch Embed",
  meta: [
    { name: "description", content: "Embed Hoppscotch instances in iframes" },
  ],
})
</script>

<template>
  <router-view />
</template>
