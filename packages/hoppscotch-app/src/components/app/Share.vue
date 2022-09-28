<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('app.invite_your_friends')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-2">
        <div class="grid grid-cols-3 gap-4">
          <a
            v-for="(platform, index) in platforms"
            :key="`platform-${index}`"
            :href="platform.link"
            target="_blank"
            class="share-link"
            tabindex="0"
          >
            <component :is="platform.icon" class="w-6 h-6" />
            <span class="mt-3">
              {{ platform.name }}
            </span>
          </a>
          <button class="share-link" @click="copyAppLink">
            <component :is="copyIcon" class="w-6 h-6 text-xl" />
            <span class="mt-3">
              {{ t("app.copy") }}
            </span>
          </button>
        </div>
      </div>
    </template>
    <template #footer>
      <p class="text-secondaryLight">
        {{ t("app.invite_description") }}
      </p>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconMail from "~icons/lucide/mail"
import IconTwitter from "~icons/brands/twitter"
import IconFacebook from "~icons/brands/facebook"
import IconReddit from "~icons/brands/reddit"
import IconLinkedIn from "~icons/brands/linkedin"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const t = useI18n()

const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const url = "https://hoppscotch.io"
const text = "Hoppscotch - Open source API development ecosystem."
const description =
  "Helps you create requests faster, saving precious time on development."
const subject = "Checkout Hoppscotch - an open source API development ecosystem"
const summary = `Hi there!%0D%0A%0D%0AI thought you'll like this new platform that I joined called Hoppscotch - https://hoppscotch.io.%0D%0AIt is a simple and intuitive interface for creating and managing your APIs. You can build, test, document, and share your APIs.%0D%0A%0D%0AThe best part about Hoppscotch is that it is open source and free to get started.%0D%0A%0D%0A`
const twitter = "hoppscotch_io"

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const platforms = [
  {
    name: "Email",
    icon: IconMail,
    link: `mailto:?subject=${subject}&body=${summary}`,
  },
  {
    name: "Twitter",
    icon: IconTwitter,
    link: `https://twitter.com/intent/tweet?text=${text} ${description}&url=${url}&via=${twitter}`,
  },
  {
    name: "Facebook",
    icon: IconFacebook,
    link: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  },
  {
    name: "Reddit",
    icon: IconReddit,
    link: `https://www.reddit.com/submit?url=${url}&title=${text}`,
  },
  {
    name: "LinkedIn",
    icon: IconLinkedIn,
    link: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  },
]

const copyAppLink = () => {
  copyToClipboard(url)
  copyIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>

<style lang="scss" scoped>
.share-link {
  @apply border border-dividerLight;
  @apply rounded;
  @apply flex-col flex;
  @apply p-4;
  @apply items-center;
  @apply justify-center;
  @apply font-semibold;
  @apply hover: (bg-primaryLight text-secondaryDark);
  @apply focus: outline-none;
  @apply focus-visible: border-divider;

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
