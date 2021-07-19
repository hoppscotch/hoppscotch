<template>
  <footer class="flex flex-col p-6">
    <nav class="grid gap-4 grid-cols-2 md:grid-cols-4">
      <div class="flex flex-col space-y-2">
        <h4 class="font-semibold my-2">Hoppscotch</h4>
        <ul class="space-y-4">
          <li>
            <SmartChangeLanguage />
          </li>
          <li>
            <SmartColorModePicker />
          </li>
        </ul>
      </div>
      <div class="flex flex-col space-y-2">
        <h4 class="font-semibold my-2">Solutions</h4>
        <ul class="space-y-2">
          <li
            v-for="(item, index) in navigation.solutions"
            :key="`item-${index}`"
          >
            <SmartAnchor
              :label="item.name"
              :to="item.link"
              class="footer-nav"
            />
          </li>
        </ul>
      </div>
      <div class="flex flex-col space-y-2">
        <h4 class="font-semibold my-2">Platform</h4>
        <ul class="space-y-2">
          <li
            v-for="(item, index) in navigation.platform"
            :key="`item-${index}`"
          >
            <SmartAnchor
              :label="item.name"
              :to="item.link"
              class="footer-nav"
            />
          </li>
        </ul>
      </div>
      <div class="flex flex-col space-y-2">
        <h4 class="font-semibold my-2">Company</h4>
        <ul class="space-y-2">
          <li
            v-for="(item, index) in navigation.company"
            :key="`item-${index}`"
          >
            <SmartAnchor
              :label="item.name"
              :to="item.link"
              class="footer-nav"
            />
          </li>
        </ul>
      </div>
    </nav>
  </footer>
</template>

<script>
export default {
  data() {
    return {
      navigation: {
        solutions: [
          {
            name: "RESTful",
            link: "/",
          },
          {
            name: "WebSocket",
            link: "/realtime",
          },
          {
            name: "SSE",
            link: "/realtime",
          },
          {
            name: "Socket.IO",
            link: "/realtime",
          },
          {
            name: "MQTT",
            link: "/realtime",
          },
          {
            name: "GraphQL",
            link: "/graphql",
          },
        ],
        platform: [
          {
            name: "API Designing",
            link: "/",
          },
          {
            name: "API Development",
            link: "/",
          },
          {
            name: "API Testing",
            link: "/",
          },
          {
            name: "API Deployment",
            link: "/",
          },
          {
            name: "API Documentation",
            link: "/documentation",
          },
          {
            name: "Integrations",
            link: "/",
          },
        ],
        company: [
          {
            name: "About",
            link: "/",
          },
          {
            name: "Careers",
            link: "/careers",
          },
          {
            name: "Support",
            link: "/",
          },
          {
            name: "Contact",
            link: "/",
          },
          {
            name: "Blog",
            link: "https://blog.hoppscotch.io",
          },
          {
            name: "Community",
            link: "/",
          },
          {
            name: "Open Source",
            link: "https://github.com/hoppscotch",
          },
        ],
      },
    }
  },
}
</script>

<style lang="scss" scoped>
.footer-nav {
  @apply text-xs;

  &:hover,
  &:focus {
    @apply text-secondaryDark;
  }
}
</style>
