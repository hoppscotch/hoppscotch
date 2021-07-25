<template>
  <div class="font-mono p-2">
    <div
      v-for="(header, index) in headers"
      :key="`header-${index}`"
      class="flex items-center"
    >
      <span
        class="flex font-semibold text-xs min-w-0 p-2 transition group-hover:text-secondaryDark"
      >
        <span class="truncate">
          {{ header.key }}
        </span>
      </span>
      <span
        class="flex font-mono font-bold mx-2 text-xs justify-center items-center truncate"
      >
        →
      </span>
      <span
        class="flex font-semibold flex-1 text-xs min-w-0 p-2 transition group-hover:text-secondaryDark"
      >
        <span class="truncate">
          {{ header.value }}
        </span>
      </span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    headers: { type: Array, default: () => [] },
  },
}
</script>
