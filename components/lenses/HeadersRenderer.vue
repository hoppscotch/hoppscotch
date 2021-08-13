<template>
  <div>
    <div
      v-for="(header, index) in headers"
      :key="`header-${index}`"
      class="
        divide-x divide-dividerLight
        border-b border-dividerLight
        flex
        group
      "
    >
      <span
        class="
          flex flex-1
          min-w-0
          py-2
          px-4
          transition
          group-hover:text-secondaryDark
        "
      >
        <span class="rounded select-all truncate">
          {{ header.key }}
        </span>
      </span>
      <span
        class="
          flex flex-1
          min-w-0
          py-2
          px-4
          transition
          group-hover:text-secondaryDark
        "
      >
        <span class="rounded select-all truncate">
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
