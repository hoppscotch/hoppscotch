<template>
  <footer class="flex flex-col p-4">
    <nav class="grid gap-4 grid-cols-2 md:grid-cols-4">
      <div class="flex flex-col space-y-2">
        <span>
          <AppLogo class="h-8" />
        </span>
        <span class="font-bold"> Hoppscotch </span>
        <SmartChangeLanguage />
        <ul class="space-y-2">
          <li>
            <SmartAnchor label="Terms" to="/about/terms" class="footer-nav" />
          </li>
          <li>
            <SmartAnchor
              label="Privacy"
              to="/about/privacy"
              class="footer-nav"
            />
          </li>
        </ul>
        <SmartColorModePicker />
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
            name: "SaaS",
            link: "/settings",
          },
          {
            name: "Products",
            link: "/settings",
          },
          {
            name: "Creators",
            link: "/settings",
          },
          {
            name: "Developers",
            link: "/settings",
          },
          {
            name: "Finance",
            link: "/settings",
          },
          {
            name: "Enterprise",
            link: "/settings",
          },
        ],
        platform: [
          {
            name: "Payments",
            link: "/settings",
          },
          {
            name: "Subscriptions",
            link: "/settings",
          },
          {
            name: "API",
            link: "https://docs.kooli.tech/api",
          },
          {
            name: "Guides",
            link: "https://docs.kooli.tech/guides",
          },
        ],
        company: [
          {
            name: "About",
            link: "/about",
          },
          {
            name: "Jobs",
            link: "/about/jobs",
          },
          {
            name: "Integrations",
            link: "/about/integrations",
          },
          {
            name: "Support",
            link: "",
          },
          {
            name: "Contact",
            link: "/about/contact",
          },
          {
            name: "Blog",
            link: "https://blog.kooli.tech",
          },
        ],
      },
    }
  },
}
</script>

<style lang="scss" scoped>
.footer-nav {
  &:hover,
  &:focus {
    @apply text-secondaryDark;
  }
}
</style>
