<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('cookies.modal.set')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartTabs v-model="currentActiveTab">
        <HoppSmartTab :id="'managed'" :label="t('cookies.modal.managed_tab')">
          <div class="flex flex-col gap-y-4">
            <div class="flex items-center">
              <label class="w-20">{{ t("cookies.modal.cookie_name") }}</label>
              <HoppSmartInput
                v-model="cookieName"
                :placeholder="t('cookies.modal.cookie_name')"
                class="flex-1"
              />
            </div>

            <div class="flex items-center">
              <label class="w-20">{{ t("cookies.modal.cookie_value") }}</label>
              <HoppSmartInput
                v-model="cookieValue"
                :placeholder="t('cookies.modal.cookie_value')"
                class="flex-1"
              />
            </div>

            <div class="flex items-center">
              <label class="w-20">{{ t("cookies.modal.cookie_path") }}</label>
              <HoppSmartInput
                v-model="cookiePath"
                :placeholder="t('cookies.modal.cookie_path')"
                class="flex-1"
              />
            </div>

            <div class="flex items-center">
              <label class="w-20">{{
                t("cookies.modal.cookie_expires")
              }}</label>
              <HoppSmartInput
                v-model="cookieExpires"
                :placeholder="t('cookies.modal.cookie_expires')"
                :type="'datetime-local'"
                class="flex-1"
              />
            </div>
          </div>
        </HoppSmartTab>

        <HoppSmartTab :id="'raw'" :label="t('cookies.modal.raw_tab')">
          <HoppSmartInput
            v-model="rawCookieString"
            :placeholder="t('cookies.modal.cookie_string')"
          />
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>

    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          v-focus
          :label="t('action.save')"
          outline
          @click="saveCookieChange"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="cancelCookieChange"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppSmartInput, HoppSmartTab } from "@hoppscotch/ui"
import { useService } from "dioc/vue"
import { watch, ref } from "vue"
import { CookieJarService } from "~/services/cookie-jar.service"

const cookieService = useService(CookieJarService)

// TODO: Build Managed Mode!

const props = defineProps<{
  show: boolean

  // Tuple of [domain, entryIndex, cookieEntry]
  entry: [string, number, string] | null
}>()

const emit = defineEmits<{
  (e: "save-cookie", cookie: string): void
  (e: "hide-modal"): void
}>()

const t = useI18n()

const currentActiveTab = ref<"managed" | "raw">("managed")

const cookieName = ref("")
const cookieValue = ref("")
const cookiePath = ref("")
const cookieExpires = ref("")

const rawCookieString = ref("")

watch(
  () => props.entry,
  () => {
    if (!props.entry) return

    const cookieEntry = props.entry[2]

    const parsedEntry = cookieService.parseSetCookieString(cookieEntry)

    rawCookieString.value = cookieEntry

    cookieName.value = parsedEntry.name ?? ""
    cookieValue.value = parsedEntry.value ?? ""
    cookiePath.value = parsedEntry.path ?? ""
    cookieExpires.value = (parsedEntry.expires ?? new Date()).toISOString()
  }
)

function hideModal() {
  emit("hide-modal")
}

function cancelCookieChange() {
  hideModal()
}

function saveCookieChange() {
  emit("save-cookie", rawCookieString.value)
}
</script>
