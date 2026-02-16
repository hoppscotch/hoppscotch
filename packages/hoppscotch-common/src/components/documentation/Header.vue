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
            class="text-md font-bold text-secondaryDark px-6 py-1 rounded-full border border-dividerDark shadow"
          >
            {{
              publishedDoc?.title || t("documentation.publish.untitled_project")
            }}
          </span>

          <div>
            <!-- Version dropdown (when multiple versions exist) -->
            <tippy
              v-if="versions.length"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => versionDropdownRef?.focus()"
            >
              <button
                class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors"
                :class="
                  isCurrentDocLive
                    ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                    : 'bg-accent/10 text-accent hover:bg-accent/20'
                "
              >
                {{
                  isCurrentDocLive
                    ? t("documentation.publish.live")
                    : `${publishedDoc?.version}`
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
                  <HoppSmartItem
                    v-for="ver in versions"
                    :key="ver.id"
                    :label="getVersionLabel(ver)"
                    :info-icon="
                      ver.version === publishedDoc?.version
                        ? IconCheck
                        : undefined
                    "
                    :active-info-icon="ver.version === publishedDoc?.version"
                    @click="
                      () => {
                        navigateToVersion(ver)
                        hide()
                      }
                    "
                  >
                    <template #prefix>
                      <span
                        class="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded mr-2"
                        :class="
                          isLiveVersion(ver)
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-accent/10 text-accent'
                        "
                      >
                        {{
                          isLiveVersion(ver)
                            ? t("documentation.publish.live")
                            : t("documentation.publish.snapshot")
                        }}
                      </span>
                    </template>
                  </HoppSmartItem>
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
 * Checks whether the currently displayed published doc is the live (current) version.
 * This is true if the doc is auto-synced, has the CURRENT version identifier, or has version 1.0.0 (legacy).
 */
const isCurrentDocLive = computed(() => {
  if (!props.publishedDoc?.version) return true
  return isLiveVersion({
    autoSync: props.publishedDoc.autoSync ?? false,
    version: props.publishedDoc.version,
  })
})

const getVersionLabel = (ver: PublishedDocVersion): string => {
  if (isLiveVersion(ver)) return t("documentation.publish.live")
  return `${ver.version}`
}

const navigateToVersion = (ver: PublishedDocVersion) => {
  if (ver.version === props.publishedDoc?.version) return

  // Extract path from the version URL and navigate
  try {
    const url = new URL(ver.url)
    router.push(url.pathname)
  } catch {
    // Fallback: use regex to extract the path
    const match = ver.url.match(/\/view\/([^/]+)\/([^/]+)/)
    if (match) {
      router.push(`/view/${match[1]}/${match[2]}`)
    }
  }
}
</script>
