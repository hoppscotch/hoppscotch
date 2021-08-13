<template>
  <div
    class="
      bg-primaryLight
      rounded
      flex
      grid
      p-4
      gap-4
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-3
    "
  >
    <div
      v-for="(cta, index) in ctas"
      :key="`cta-${index}`"
      class="flex-col p-8 inline-flex"
    >
      <i class="text-accent text-3xl material-icons">{{ cta.icon }}</i>
      <div class="flex-grow">
        <h2 class="mt-4 text-lg text-secondaryDark mb-2 transition">
          {{ cta.title }}
        </h2>
        <p>
          {{ cta.description }}
        </p>
        <p class="mt-2">
          <SmartLink :to="cta.link.target" class="link" blank>
            {{ cta.link.title }}
            <i class="material-icons">chevron_right</i>
          </SmartLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      ctas: [
        {
          icon: "layers",
          title: "Feature",
          description:
            "Get up and running with Kooli in as little as 10 minutes.",
          link: {
            title: "Feature",
            target: "https://docs.hoppscotch.io/api",
          },
        },
        {
          icon: "local_library",
          title: "Feature",
          description:
            "Explore and start integrating Kooli's products and tools.",
          link: {
            title: "Feature",
            target: "https://docs.hoppscotch.io/guides",
          },
        },
        {
          icon: "local_library",
          title: "Feature",
          description:
            "Explore and start integrating Kooli's products and tools.",
          link: {
            title: "Feature",
            target: "https://docs.hoppscotch.io/guides",
          },
        },
      ],
    }
  },
}
</script>
