<template>
  <div class="md:grid md:grid-cols-3 md:gap-4">
    <div class="p-8 md:col-span-1">
      <h3 class="heading">
        {{ t("settings.desktop_section_title") }}
      </h3>
      <p class="my-1 text-secondaryLight">
        {{ t("settings.desktop_section_description") }}
      </p>
    </div>
    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <div class="flex items-center">
          <HoppSmartToggle
            :on="disableCheckForUpdates"
            @change="toggleCheckForUpdates"
          >
            {{ t("settings.disable_check_for_updates") }}
          </HoppSmartToggle>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import * as E from "fp-ts/Either"
import { useI18n } from "@hoppscotch/common/composables/i18n"
import { HoppSmartToggle } from "@hoppscotch/ui"
import { Store } from "@app/kernel/store"

defineOptions({ name: "DesktopCustomSettings" })

export const id = "desktop-custom-settings"
const t = useI18n()

interface DesktopSettings {
  disableCheckForUpdates: boolean
}

const STORE_NAMESPACE = "hoppscotch-desktop.v1"
const STORE_KEY = "desktopSettings"

const DEFAULT_SETTINGS: DesktopSettings = {
  disableCheckForUpdates: false,
}

const disableCheckForUpdates = ref(DEFAULT_SETTINGS.disableCheckForUpdates)

async function loadSettings(): Promise<DesktopSettings> {
  const result = await Store.get<DesktopSettings>(STORE_NAMESPACE, STORE_KEY)

  if (E.isRight(result) && result.right) {
    return result.right
  }

  return { ...DEFAULT_SETTINGS }
}

async function saveSettings(settings: DesktopSettings): Promise<void> {
  const result = await Store.set(STORE_NAMESPACE, STORE_KEY, settings)

  if (E.isLeft(result)) {
    console.error("Failed to save desktop settings:", result.left)
  }
}

async function toggleCheckForUpdates() {
  disableCheckForUpdates.value = !disableCheckForUpdates.value

  const current = await loadSettings()
  await saveSettings({
    ...current,
    disableCheckForUpdates: disableCheckForUpdates.value,
  })
}

onMounted(async () => {
  const settings = await loadSettings()
  disableCheckForUpdates.value = settings.disableCheckForUpdates
})
</script>
