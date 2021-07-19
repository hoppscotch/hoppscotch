<template>
  <div class="flex flex-col p-4">
    <div class="flex flex-col items-center">
      <p class="font-semibold my-4 text-center text-accent tracking-widest">
        FEATURES
      </p>
    </div>
    <div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(feature, index) in features"
        :key="`feature-${index}`"
        class="flex-col p-8 inline-flex"
      >
        <i class="text-accent text-4xl material-icons">{{ feature.icon }}</i>
        <div class="flex-grow">
          <h2
            class="
              font-semibold
              mt-4
              text-lg text-secondaryDark
              mb-2
              transition
            "
          >
            {{ feature.title }}
          </h2>
          <p>
            {{ feature.description }}
          </p>
          <p class="mt-2">
            <NuxtLink :to="feature.link.target" class="link">
              {{ feature.link.title }}
              <i class="material-icons">chevron_right</i>
            </NuxtLink>
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
      features: [
        {
          icon: "offline_bolt",
          title: "Feature",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nam vel vero quia tenetur obcaecati. Distinctio nesciunt obcaecati deserunt.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "stars",
          title: "Feature",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nam vel vero quia tenetur obcaecati. Distinctio nesciunt obcaecati deserunt.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "supervised_user_circle",
          title: "Feature",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nam vel vero quia tenetur obcaecati. Distinctio nesciunt obcaecati deserunt.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "build_circle",
          title: "Feature",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nam vel vero quia tenetur obcaecati. Distinctio nesciunt obcaecati deserunt.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "monetization_on",
          title: "Feature",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nam vel vero quia tenetur obcaecati. Distinctio nesciunt obcaecati deserunt.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "group_work",
          title: "Feature",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nam vel vero quia tenetur obcaecati. Distinctio nesciunt obcaecati deserunt.",
          link: { title: "Learn more", target: "/settings" },
        },
      ],
    }
  },
}
</script>
