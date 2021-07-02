<template>
  <div class="flex flex-col p-4">
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div
        class="inline-flex flex-col transition border rounded-lg border-divider"
      >
        <div class="flex flex-col p-8">
          <p class="font-semibold tracking-widest text-accent">API</p>
          <h3
            class="
              max-w-xl
              my-4
              text-4xl
              font-semibold
              leading-tight
              tracking-tight
              transition
              text-secondaryDark
            "
          >
            Powerful and easy-to-use APIs
          </h3>
          <p class="my-4 text-lg md:w-4/5">
            We agonize over the right abstractions so your teams don’t need to
            stitch together disparate systems or spend months integrating
            payments functionality.
          </p>
          <div class="flex mt-4">
            <ButtonPrimary
              to="https://docs.kooli.tech/guides"
              label="Read the docs"
              icon="chevron_right"
              reverse
            />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div
            v-for="(api, index) in apis"
            :key="`api-${index}`"
            class="inline-flex flex-col p-8"
          >
            <i class="text-3xl material-icons text-accent">{{ api.icon }}</i>
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
                {{ api.title }}
              </h2>
              <p>
                {{ api.description }}
              </p>
              <p class="mt-2">
                <SmartLink :to="api.link.target" class="link">
                  {{ api.link.title }}
                  <i class="material-icons">chevron_right</i>
                </SmartLink>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        class="
          inline-flex
          flex-col
          p-4
          transition
          border
          rounded-lg
          border-divider
          bg-primaryLight
        "
      >
        <div class="flex">
          <div class="w-3 h-3 mr-2 bg-red-500 rounded-full"></div>
          <div class="w-3 h-3 mr-2 bg-yellow-500 rounded-full"></div>
          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div class="flex flex-1 p-4 overflow-auto whitespace-pre">
          <pre>
/*
 ** TailwindCSS Configuration File
 **
 ** Docs: https://tailwindcss.com/docs/configuration
 ** Default: https://github.com/tailwindcss/tailwindcss/blob/master/stubs/defaultConfig.stub.js
 */
module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  experimental: "all",
  dark: "class",
  corePlugins: {
    float: false,
    clear: false,
    transitionDelay: false,
    skew: false,
  },
}
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      apis: [
        {
          icon: "layers",
          title: "Tools for every stack",
          description:
            "We offer client and server libraries in everything from React, PHP to .NET and iOS.",
          link: {
            title: "See libraries",
            target: "https://docs.kooli.tech/api",
          },
        },
        {
          icon: "extension",
          title: "Prebuilt integrations",
          description:
            "Use integrations for systems like Shopify, PayPal, and more.",
          link: { title: "Explore partners", target: "/about/integrations" },
        },
      ],
    }
  },
}
</script>
