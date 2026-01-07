<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-4 border-b border-divider">
      <span class="text-secondaryLight font-semibold">
        {{ t("tab.cookies") }}
      </span>
      <HoppButtonSecondary
        v-if="cookies.length > 0"
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.clear_all')"
        :icon="IconTrash2"
        @click="clearAllCookies"
      />
    </div>

    <div v-if="cookies.length === 0" class="flex flex-col items-center justify-center flex-1 p-4">
      <icon-lucide-cookie class="mb-4 text-secondaryLight" size="32" />
      <span class="text-secondaryLight text-center">
        {{ t('empty.no_cookies_in_domain') }}
      </span>
    </div>

    <div v-else class="flex-1 overflow-auto">
      <div
        v-for="(cookie, index) in cookies"
        :key="`${cookie.domain}-${cookie.name}-${index}`"
        class="flex items-center gap-4 p-4 border-b border-divider hover:bg-primaryLight"
      >
        <div class="flex-1 flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-secondaryDark">{{ cookie.name }}</span>
            <span class="text-xs text-secondaryLight">{{ cookie.domain }}</span>
          </div>
          <div class="text-sm text-secondary font-mono truncate">{{ cookie.value }}</div>
          <div class="flex items-center gap-4 text-xs text-secondaryLight">
            <span v-if="cookie.path">Path: {{ cookie.path }}</span>
            <span v-if="cookie.expires">Expires: {{ formatExpiry(cookie.expires) }}</span>
            <span v-if="cookie.secure" class="flex items-center gap-1">
              <icon-lucide-lock size="12" />
              Secure
            </span>
            <span v-if="cookie.httpOnly" class="flex items-center gap-1">
              <icon-lucide-shield size="12" />
              HttpOnly
            </span>
            <span v-if="cookie.sameSite">SameSite: {{ cookie.sameSite }}</span>
          </div>
        </div>
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.remove')"
          :icon="IconX"
          @click="removeCookie(cookie)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { CookieJarService } from "~/services/cookie-jar.service"
import IconTrash2 from "~icons/lucide/trash-2"
import IconX from "~icons/lucide/x"

const t = useI18n()

const props = defineProps<{
  url: string
}>()

const cookieJarService = useService(CookieJarService)

const cookies = computed(() => {
  console.log('[Cookies.vue] Computing cookies for URL:', props.url)
  console.log('[Cookies.vue] CookieJar size:', cookieJarService.cookieJar.value.size)
  
  if (!props.url) {
    console.log('[Cookies.vue] No URL provided')
    return []
  }
  
  try {
    const result = cookieJarService.getCookiesForURL(props.url)
    console.log('[Cookies.vue] Cookies found:', result.length, result)
    return result
  } catch (error) {
    console.error("[Cookies.vue] Error getting cookies:", error)
    return []
  }
})

const removeCookie = (cookie: any) => {
  try {
    cookieJarService.removeCookie(cookie.name, cookie.domain, cookie.path)
  } catch (error) {
    console.error("Error removing cookie:", error)
  }
}

const clearAllCookies = () => {
  if (!props.url) return
  
  try {
    const url = new URL(props.url)
    cookieJarService.clearCookiesForDomain(url.hostname)
  } catch (error) {
    console.error("Error clearing cookies:", error)
  }
}

const formatExpiry = (expires: string | Date) => {
  try {
    const date = typeof expires === 'string' ? new Date(expires) : expires
    return date.toLocaleString()
  } catch {
    return String(expires)
  }
}
</script>
