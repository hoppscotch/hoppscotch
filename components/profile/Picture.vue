<template>
  <div class="cursor-pointer flex h-5 w-5 relative items-center justify-center">
    <img
      class="
        bg-primaryDark bg-primaryLight
        rounded-full
        object-cover object-center
        h-5
        transition
        w-5
        absolute
      "
      :src="url"
      :alt="alt"
      loading="lazy"
    />
    <div class="rounded-full shadow-inner inset-0 absolute"></div>
    <span
      :class="[
        'border-primary rounded-full border-2 h-3 -top-1 -right-1 w-3 absolute',
        indicator,
      ]"
    ></span>
  </div>
</template>

<script>
export default {
  props: {
    url: {
      type: String,
      default: `https://avatars.dicebear.com/v2/avataaars/${Math.random()
        .toString(36)
        .substring(7)}.svg?mood[]=happy`,
    },
    alt: {
      type: String,
      default: "Profile picture",
    },
    indicator: {
      type: String,
      default: "bg-green-500",
    },
  },
}
</script>
