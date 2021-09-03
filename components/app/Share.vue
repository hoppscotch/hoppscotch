<template>
  <SmartModal
    v-if="show"
    :title="$t('app.invite_your_friends')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <p class="text-secondaryLight mb-8 px-2">
        {{ $t("app.invite_description") }}
      </p>
      <div class="flex flex-col space-y-2 px-2">
        <div class="grid gap-4 grid-cols-3">
          <a
            v-for="(platform, index) in platforms"
            :key="`platform-${index}`"
            :href="platform.link"
            target="_blank"
            class="share-link"
          >
            <SmartIcon :name="platform.icon" class="h-6 w-6" />
            <span class="mt-3">
              {{ platform.name }}
            </span>
          </a>
          <button class="share-link" @click="copyAppLink">
            <SmartIcon class="h-6 text-xl w-6" :name="copyIcon" />
            <span class="mt-3">
              {{ $t("app.copy") }}
            </span>
          </button>
        </div>
      </div>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { copyToClipboard } from "~/helpers/utils/clipboard"

export default defineComponent({
  props: {
    show: Boolean,
  },
  data() {
    const url = "https://hoppscotch.io"
    const text = "Hoppscotch - Open source API development ecosystem."
    const description =
      "Helps you create requests faster, saving precious time on development."
    const subject =
      "Checkout Hoppscotch - an open source API development ecosystem"
    const summary = `Hi there!%0D%0A%0D%0AI thought you’ll like this new platform that I joined called Hoppscotch - https://hoppscotch.io.%0D%0AIt is a simple and intuitive interface for creating and managing your APIs. You can build, test, document, and share your APIs.%0D%0A%0D%0AThe best part about Hoppscotch is that it is open source and free to get started.%0D%0A%0D%0A`
    const twitter = "hoppscotch_io"

    return {
      url: "https://hoppscotch.io",
      copyIcon: "copy",
      platforms: [
        {
          name: "Email",
          icon: "mail",
          link: `mailto:?subject=${subject}&body=${summary}`,
        },
        {
          name: "Twitter",
          icon: "brands/twitter",
          link: `https://twitter.com/intent/tweet?text=${text} ${description}&url=${url}&via=${twitter}`,
        },
        {
          name: "Facebook",
          icon: "brands/facebook",
          link: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        },
        {
          name: "Reddit",
          icon: "brands/reddit",
          link: `https://www.reddit.com/submit?url=${url}&title=${text}`,
        },
        {
          name: "LinkedIn",
          icon: "brands/linkedin",
          link: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        },
      ],
    }
  },
  methods: {
    copyAppLink() {
      copyToClipboard(this.url)
      this.copyIcon = "check"
      this.$toast.success(this.$t("state.copied_to_clipboard").toString(), {
        icon: "content_paste",
      })
      setTimeout(() => (this.copyIcon = "copy"), 1000)
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
})
</script>

<style lang="scss" scoped>
.share-link {
  @apply border border-dividerLight;
  @apply rounded;
  @apply flex-col flex;
  @apply p-4;
  @apply items-center;
  @apply justify-center;
  @apply hover:(bg-primaryLight text-secondaryDark);
  @apply focus:outline-none;
  @apply focus-visible:border-divider;

  svg {
    @apply opacity-80;
  }

  &:hover {
    svg {
      @apply opacity-100;
    }
  }
}
</style>
