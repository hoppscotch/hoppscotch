<template>
  <div class="p-2 font-mono">
    <div
      v-for="(header, index) in headers"
      :key="`header-${index}`"
      class="flex items-center"
    >
      <span
        class="
          p-2
          flex
          min-w-0
          text-xs
          group-hover:text-secondaryDark
          transition
          font-semibold
        "
      >
        <span class="truncate">
          {{ header.key }}
        </span>
      </span>
      <span
        class="
          font-mono font-bold
          flex
          justify-center
          items-center
          text-xs
          mx-2
          truncate
        "
      >
        →
      </span>
      <span
        class="
          p-2
          flex flex-1
          min-w-0
          text-xs
          group-hover:text-secondaryDark
          transition
          font-semibold
        "
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
