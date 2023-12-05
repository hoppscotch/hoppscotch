<template>
  <span
    class="inline-flex items-center space-x-1 justify-center rounded px-2 bg-primaryDark"
  >
    <IconLucideFile class="opacity-75 svg-icons" />
    <span class="truncate max-w-[16rem]"><slot></slot></span>
  </span>
</template>

<script setup lang="ts">
import IconLucideFile from "~icons/lucide/file"
</script>
