<template>
  <div class="flex flex-col p-4">
    <div class="flex flex-col items-center">
      <p class="my-4 font-semibold tracking-widest text-center text-accent">
        FEATURES
      </p>
      <h3
        class="
          max-w-xl
          mt-4
          mb-8
          text-4xl
          font-bold
          leading-tight
          tracking-tight
          text-center
          transition
          text-secondaryDark
        "
      >
        A technology-first approach to payments and finance
      </h3>
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="(feature, index) in features"
        :key="`feature-${index}`"
        class="
          inline-flex
          flex-col
          p-8
          transition
          border
          rounded-lg
          border-divider
        "
      >
        <i class="text-3xl material-icons text-accent">{{ feature.icon }}</i>
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
          title: "SaaS Executives",
          description:
            "Unblock your barriers to new markets to sell software globally, to companies of all sizes, at all different price points, and increase your revenue growth with Kooli’s SaaS Commerce Platform.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "stars",
          title: "Product Managers",
          description:
            "Don’t let your billing stack hold you back. Everything you need to grow your SaaS business. Subscription billing, payments, taxes and more, in one unified platform.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "supervised_user_circle",
          title: "Creators",
          description:
            "Kooli is for artists and creators: writers, designers, software developers, musicians, educators, filmmakers, and anyone in-between. If you make stuff, you can sell that stuff.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "build_circle",
          title: "Developers",
          description:
            "Focus on building, not billing. Save the blood, sweat and tears for your software development, not your billing stack, with Paddle’s subscription and commerce platform.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "monetization_on",
          title: "Finance",
          description:
            "All your payments, subscriptions, taxes, invoices, SaaS metrics, and more in one place. Integrate your product, CRM, and accounting with only one tool, not dozens.",
          link: { title: "Learn more", target: "/settings" },
        },
        {
          icon: "group_work",
          title: "Enterprise",
          description:
            "Accept payments in 135+ currencies to better serve your international customers with a single integration. No international business entity required. Fees exclude GST.",
          link: { title: "Learn more", target: "/settings" },
        },
      ],
    }
  },
}
</script>
