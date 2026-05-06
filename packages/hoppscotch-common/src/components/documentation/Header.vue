<template>
  <header class="border-b border-divider bg-primary">
    <div class="px-6 py-4">
      <div class="flex items-center space-x-8">
        <div>
          <span
            class="!font-bold uppercase tracking-wide !text-secondaryDark pr-1"
          >
            {{ instanceDisplayName }}
          </span>
        </div>
        <div class="flex items-center gap-4">
          <span
            class="text-md font-bold text-secondaryDark px-6 py-1 rounded-full"
          >
            {{
              publishedDoc?.title || t("documentation.publish.untitled_project")
            }}
          </span>

          <div class="flex items-center gap-2">
            <!-- Live indicator pill -->
            <div
              v-if="isCurrentDocLive"
              class="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 shadow-sm shadow-green-500/10"
            >
              <span class="relative flex items-center justify-center">
                <span
                  class="absolute w-2 h-2 rounded-full bg-green-500/40 animate-ping"
                />
                <span class="relative w-1 h-1 rounded-full bg-green-500" />
              </span>
              <span
                class="text-[9px] font-bold uppercase tracking-wider text-green-600"
              >
                {{ t("documentation.publish.live") }}
              </span>
            </div>

            <!-- Version dropdown (when multiple versions exist) -->
            <tippy
              v-if="versions.length"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => versionDropdownRef?.focus()"
            >
              <button
                class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors bg-accent/10 text-accent hover:bg-accent/20 border border-dividerDark"
              >
                <icon-lucide-globe class="w-3.5 h-3.5" />
                {{
                  publishedDoc?.version || t("documentation.publish.published")
                }}
                <icon-lucide-chevron-down class="w-3 h-3" />
              </button>

              <template #content="{ hide }">
                <div
                  ref="versionDropdownRef"
                  role="menu"
                  class="flex flex-col focus:outline-none min-w-[180px]"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <div
                    v-for="ver in versions"
                    :key="ver.id"
                    :class="{ 'version-item--live': isLiveVersion(ver) }"
                    class="flex-1"
                  >
                    <HoppSmartItem
                      :icon="IconGlobe"
                      :label="ver.version"
                      :info-icon="
                        ver.version === publishedDoc?.version
                          ? IconCheck
                          : undefined
                      "
                      :active-info-icon="ver.version === publishedDoc?.version"
                      class="w-full"
                      @click="
                        () => {
                          navigateToVersion(ver)
                          hide()
                        }
                      "
                    />
                  </div>
                </div>
              </template>
            </tippy>
          </div>

          <div>
            <!-- Environment dropdown -->
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => envDropdownRef?.focus()"
            >
              <HoppSmartSelectWrapper>
                <HoppButtonSecondary
                  :label="
                    environmentEnabled
                      ? `${environmentName}`
                      : t('documentation.publish.no_environment')
                  "
                  :icon="IconLayers"
                  :icon-position="'left'"
                  class="flex-1 !justify-start rounded-none pr-8"
                />
              </HoppSmartSelectWrapper>
              <template #content="{ hide }">
                <div
                  ref="envDropdownRef"
                  role="menu"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    v-if="environmentName"
                    :label="environmentName"
                    :info-icon="environmentEnabled ? IconCheck : undefined"
                    :active-info-icon="environmentEnabled"
                    @click="
                      () => {
                        $emit('toggleEnvironment', true)
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    :label="t('documentation.publish.no_environment')"
                    :info-icon="!environmentEnabled ? IconCheck : undefined"
                    :active-info-icon="!environmentEnabled"
                    @click="
                      () => {
                        $emit('toggleEnvironment', false)
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { useRouter } from "vue-router"
import { computed, PropType, ref } from "vue"
import { PublishedDocs } from "~/helpers/backend/graphql"
import IconCheck from "~icons/lucide/check"
import IconGlobe from "~icons/lucide/globe"
import IconLayers from "~icons/lucide/layers"
import { isLiveVersion } from "~/services/documentation.service"

type PublishedDocVersion = {
  id: string
  slug: string
  version: string
  title: string
  autoSync: boolean
  url: string
}

const t = useI18n()
const router = useRouter()

const props = defineProps({
  publishedDoc: {
    type: Object as PropType<Partial<PublishedDocs> | null>,
    default: null,
  },
  instanceDisplayName: {
    type: String,
    default: "Hoppscotch",
  },
  versions: {
    type: Array as PropType<PublishedDocVersion[]>,
    default: () => [],
  },
  environmentName: {
    type: String as PropType<string | null>,
    default: null,
  },
  environmentEnabled: {
    type: Boolean,
    default: true,
  },
})

defineEmits<{
  (e: "toggleEnvironment", enabled: boolean): void
}>()

const versionDropdownRef = ref<HTMLElement | null>(null)
const envDropdownRef = ref<HTMLElement | null>(null)

/**
 * Checks whether the currently displayed published doc is the live version —
 * this is purely based on the auto-sync flag.
 */
const isCurrentDocLive = computed(() => {
  if (!props.publishedDoc) return false
  return isLiveVersion({
    autoSync: props.publishedDoc.autoSync ?? false,
  })
})

const navigateToVersion = (ver: PublishedDocVersion) => {
  if (ver.version === props.publishedDoc?.version) return

  // Extract path from the version URL and navigate (handles both absolute and relative URLs)
  try {
    const url = new URL(ver.url, window.location.origin)
    router.push(url.pathname)
  } catch {
    // Fallback: use regex to extract the path
    const match = ver.url.match(/\/view\/([^/]+)/)
    if (match) {
      router.push(match[0])
    }
  }
}
</script>

<style scoped>
/* Color the leading globe icon green for live versions */
.version-item--live :deep(.svg-icons.mr-4) {
  @apply text-green-500;
}
</style>
