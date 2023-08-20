<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('app.social_links')"
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
            class="social-link"
            tabindex="0"
          >
            <component :is="platform.icon" class="w-6 h-6" />
            <span class="mt-3">
              {{ platform.name }}
            </span>
          </a>
          <button class="social-link" @click="copyAppLink">
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
        {{ t("app.social_description") }}
      </p>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import IconFacebook from "~icons/brands/facebook"
import IconLinkedIn from "~icons/brands/linkedin"
import IconReddit from "~icons/brands/reddit"
import IconTwitter from "~icons/brands/twitter"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconGitHub from "~icons/lucide/github"

const t = useI18n()

const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const url = "https://hoppscotch.io"

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const platforms = [
  {
    name: "GitHub",
    icon: IconGitHub,
    link: `https://hoppscotch.io/github`,
  },
  {
    name: "Twitter",
    icon: IconTwitter,
    link: `https://twitter.com/hoppscotch_io`,
  },
  {
    name: "Facebook",
    icon: IconFacebook,
    link: `https://www.facebook.com/hoppscotch.io`,
  },
  {
    name: "Reddit",
    icon: IconReddit,
    link: `https://www.reddit.com/r/hoppscotch`,
  },
  {
    name: "LinkedIn",
    icon: IconLinkedIn,
    link: `https://www.linkedin.com/company/hoppscotch/`,
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
.social-link {
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
