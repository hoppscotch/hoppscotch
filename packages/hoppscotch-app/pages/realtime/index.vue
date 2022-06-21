<template>
  <div></div>
</template>
<script setup lang="ts">
import { useRouter } from "@nuxtjs/composition-api"
const router = useRouter()
router.push({
  path: "/realtime/websocket",
})
</script>
