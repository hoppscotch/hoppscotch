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
import { APP_IS_IN_DEV_MODE } from "~/helpers/dev"
import IconTrash2 from "~icons/lucide/trash-2"
import IconX from "~icons/lucide/x"

const t = useI18n()

const props = defineProps<{
  url: string
}>()

const cookieJarService = useService(CookieJarService)

const cookies = computed(() => {
  if (APP_IS_IN_DEV_MODE) {
    console.log('[Cookies.vue] Computing cookies for URL:', props.url)
    console.log('[Cookies.vue] CookieJar size:', cookieJarService.cookieJar.value.size)
  }
  
  if (!props.url) {
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] No URL provided')
    }
    return []
  }
  
  try {
    const result = cookieJarService.getCookiesForURL(props.url)
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] Cookies found:', result.length, result)
    }
    return result
  } catch (error) {
    console.error("[Cookies.vue] Error getting cookies:", error)
    return []
  }
})

const removeCookie = (cookie: any) => {
  if (APP_IS_IN_DEV_MODE) {
    console.log('[Cookies.vue] removeCookie called:', { name: cookie.name, domain: cookie.domain, path: cookie.path })
  }
  try {
    // Use the exact domain from the cookie object
    cookieJarService.removeCookie(cookie.name, cookie.domain, cookie.path)
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] removeCookie completed')
    }
  } catch (error) {
    console.error("[Cookies.vue] Error removing cookie:", error)
  }
}

const clearAllCookies = () => {
  if (APP_IS_IN_DEV_MODE) {
    console.log('[Cookies.vue] clearAllCookies called for URL:', props.url)
  }
  if (!props.url) return
  
  try {
    const url = new URL(props.url)
    const hostname = url.hostname
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] Hostname:', hostname)
    }
    
    // Get all matching domains for this URL (including parent domains with dots)
    const allDomains = Array.from(cookieJarService.cookieJar.value.keys())
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] All domains in jar:', allDomains)
    }
    
    const matchingDomains = allDomains.filter(domain => {
      // Exact match
      if (hostname === domain) return true
      
      // Cookie domain with leading dot (e.g., .example.com)
      if (domain.startsWith('.')) {
        const domainWithoutDot = domain.slice(1)
        // Match if hostname equals domain without dot, or is a subdomain
        return hostname === domainWithoutDot || hostname.endsWith(domain)
      }
      
      // Cookie domain without leading dot - check if hostname is a subdomain with proper dot boundary
      // e.g., hostname "www.example.com" should match domain "example.com" but not "ample.com"
      if (hostname.endsWith('.' + domain)) return true
      
      // Cookie domain could be stored as parent of hostname (e.g., domain ".example.com" for hostname "example.com")
      if (domain.startsWith('.') && domain.slice(1) === hostname) return true
      
      return false
    })
    
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] Matching domains:', matchingDomains)
    }
    
    // Clear cookies for all matching domains
    matchingDomains.forEach(domain => {
      if (APP_IS_IN_DEV_MODE) {
        console.log('[Cookies.vue] Clearing domain:', domain)
      }
      cookieJarService.clearCookiesForDomain(domain)
    })
    
    if (APP_IS_IN_DEV_MODE) {
      console.log('[Cookies.vue] clearAllCookies completed')
    }
  } catch (error) {
    console.error("[Cookies.vue] Error clearing cookies:", error)
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
