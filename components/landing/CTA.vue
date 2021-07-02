<template>
  <div class="flex p-4 bg-primaryLight rounded">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(cta, index) in ctas"
        :key="`cta-${index}`"
        class="inline-flex flex-col p-8"
      >
        <i class="text-3xl material-icons text-accent">{{ cta.icon }}</i>
        <div class="flex-grow">
          <h2
            class="
              mt-4
              mb-2
              text-lg
              font-semibold
              transition
              text-secondaryDark
            "
          >
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
  </div>
</template>

<script>
export default {
  data() {
    return {
      ctas: [
        {
          icon: "layers",
          title: "API Documentation",
          description:
            "Get up and running with Kooli in as little as 10 minutes.",
          link: {
            title: "API reference",
            target: "https://docs.kooli.tech/api",
          },
        },
        {
          icon: "local_library",
          title: "Guides",
          description:
            "Explore and start integrating Kooli's products and tools.",
          link: {
            title: "Guides and resources",
            target: "https://docs.kooli.tech/guides",
          },
        },
        {
          icon: "local_library",
          title: "Guides",
          description:
            "Explore and start integrating Kooli's products and tools.",
          link: {
            title: "Guides and resources",
            target: "https://docs.kooli.tech/guides",
          },
        },
      ],
    }
  },
}
</script>
