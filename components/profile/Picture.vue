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
      v-if="indicator"
      :class="[
        'border-primary rounded-full border-2 h-2.5 -top-0.5 -right-0.5 w-2.5 absolute',
        indicatorStyles,
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
      type: Boolean,
      default: false,
    },
    indicatorStyles: {
      type: String,
      default: "bg-green-500",
    },
  },
}
</script>
