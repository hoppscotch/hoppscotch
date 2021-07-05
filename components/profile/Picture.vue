<template>
  <div class="relative flex items-center justify-center h-5 w-5 cursor-pointer">
    <img
      class="
        absolute
        object-cover object-center
        transition
        rounded-full
        bg-primaryDark
        h-5
        w-5
        bg-primaryLight
      "
      :src="url"
      :alt="alt"
      loading="lazy"
    />
    <div class="absolute inset-0 rounded-lg shadow-inner"></div>
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
  },
}
</script>
