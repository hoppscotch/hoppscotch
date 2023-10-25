<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('app.cookies')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div
        v-if="!currentInterceptorSupportsCookies"
        class="flex flex-col gap-2 p-5 items-center"
      >
        <icon-lucide-info />
        {{ t("cookies.modal.interceptor_no_support") }}
      </div>

      <div class="flex gap-x-2 border-b border-dividerLight pb-3">
        <HoppSmartInput
          v-model="newDomainText"
          class="flex-grow"
          :placeholder="t('cookies.modal.new_domain_name')"
        />
        <HoppButtonSecondary
          outline
          filled
          :label="t('action.add')"
          @click="addNewDomain"
        />
      </div>
      <div class="pt-3 flex flex-col gap-y-6">
        <div
          v-if="workingCookieJar.size === 0"
          class="flex flex-col items-center p-5 gap-2"
        >
          <icon-lucide-info />
          {{ t("cookies.modal.no_domains") }}
        </div>
        <div
          v-else
          v-for="[domain, entries] in workingCookieJar.entries()"
          :key="domain"
          class="flex flex-col gap-y-2"
        >
          <div class="flex items-center justify-between">
            <h3>{{ domain }}</h3>
            <div>
              <HoppButtonSecondary
                :icon="IconTrash2"
                @click="deleteDomain(domain)"
              />
              <HoppButtonSecondary
                :icon="IconPlus"
                @click="addCookieToDomain(domain)"
              />
            </div>
          </div>

          <div class="border rounded border-divider">
            <div class="divide-y divide-dividerLight">
              <div
                v-if="entries.length === 0"
                class="flex flex-col items-center p-5 gap-2"
              >
                <icon-lucide-info />
                {{ t("cookies.modal.no_cookies_in_domain") }}
              </div>
              <div
                v-else
                v-for="(entry, entryIndex) in entries"
                :key="`${entry}-${entryIndex}`"
                class="flex divide-x divide-dividerLight"
              >
                <input
                  class="flex flex-1 px-4 py-2 bg-transparent"
                  :value="entry"
                  readonly
                />
                <HoppButtonSecondary
                  :icon="IconEdit"
                  @click="editCookie(domain, entryIndex, entry)"
                />
                <HoppButtonSecondary
                  color="red"
                  :icon="IconTrash"
                  @click="deleteCookie(domain, entryIndex)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          v-focus
          :label="t('action.save')"
          outline
          @click="saveCookieChanges"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="cancelCookieChanges"
        />
      </span>
      <HoppButtonSecondary
        :label="t('action.clear_all')"
        outline
        filled
        @click="hideModal"
      />
    </template>
  </HoppSmartModal>
  <CookiesEditCookie
    :show="!!showEditModalFor"
    :entry="showEditModalFor"
    @save-cookie="saveCookie"
    @hide-modal="showEditModalFor = null"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { CookieJarService } from "~/services/cookie-jar.service"
import IconTrash from "~icons/lucide/trash"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlus from "~icons/lucide/plus"
import { cloneDeep } from "lodash-es"
import { ref, watch, computed } from "vue"
import { InterceptorService } from "~/services/interceptor.service"
import { EditCookieConfig } from "./EditCookie.vue"

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const t = useI18n()

const newDomainText = ref("")

const interceptorService = useService(InterceptorService)
const cookieJarService = useService(CookieJarService)

const workingCookieJar = ref(cloneDeep(cookieJarService.cookieJar.value))

const currentInterceptorSupportsCookies = computed(() => {
  const currentInterceptor = interceptorService.currentInterceptor.value

  if (!currentInterceptor) return true

  return currentInterceptor.supportsCookies ?? false
})

function addNewDomain() {
  workingCookieJar.value.set(newDomainText.value, [])
  newDomainText.value = ""
}

function deleteDomain(domain: string) {
  workingCookieJar.value.delete(domain)
}

function addCookieToDomain(domain: string) {
  showEditModalFor.value = { type: "create", domain }
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      workingCookieJar.value = cloneDeep(cookieJarService.cookieJar.value)
    }
  }
)

const showEditModalFor = ref<EditCookieConfig | null>(null)

function saveCookieChanges() {
  cookieJarService.cookieJar.value = workingCookieJar.value
  hideModal()
}

function cancelCookieChanges() {
  hideModal()
}

function editCookie(domain: string, entryIndex: number, cookieEntry: string) {
  showEditModalFor.value = {
    type: "edit",
    domain,
    entryIndex,
    currentCookieEntry: cookieEntry,
  }
}

function deleteCookie(domain: string, entryIndex: number) {
  const entry = workingCookieJar.value.get(domain)

  if (entry) {
    entry.splice(entryIndex, 1)
  }
}

function saveCookie(cookie: string) {
  if (showEditModalFor.value?.type === "create") {
    const { domain } = showEditModalFor.value

    const entry = workingCookieJar.value.get(domain)!
    entry.push(cookie)

    showEditModalFor.value = null

    return
  }

  if (showEditModalFor.value?.type !== "edit") return

  const { domain, entryIndex } = showEditModalFor.value!

  const entry = workingCookieJar.value.get(domain)

  if (entry) {
    entry[entryIndex] = cookie
  }

  showEditModalFor.value = null
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
