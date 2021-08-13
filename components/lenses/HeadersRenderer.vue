<template>
  <div class="p-2">
    <div
      v-for="(header, index) in headers"
      :key="`header-${index}`"
      class="flex items-center"
    >
      <span class="flex min-w-0 p-2 transition group-hover:text-secondaryDark">
        <span class="rounded select-all truncate">
          {{ header.key }}
        </span>
      </span>
      <span class="flex mx-2 justify-center items-center truncate"> → </span>
      <span
        class="
          flex flex-1
          min-w-0
          p-2
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
