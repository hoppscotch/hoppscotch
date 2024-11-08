<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('agent.registrations')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-4">
        <div v-if="isLoading" class="text-center text-secondaryLight py-4">
          Loading...
        </div>
        <ul
          v-else-if="registrations.length > 0"
          class="mx-4 border border-dividerDark rounded"
        >
          <li
            v-for="(registration, index) in registrations"
            :key="registration.maskedAuthKey"
            class="flex border-dividerDark px-2 py-2 items-center justify-between"
            :class="{ 'border-t border-dividerDark': index !== 0 }"
          >
            <div class="flex text-xs items-center space-x-2 truncate">
              <span class="text-secondaryLight">
                {{ formatDate(registration.registeredAt) }}
              </span>
              <span class="truncate">
                {{ registration.maskedAuthKey }}
              </span>
            </div>
            <div class="flex items-center">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :icon="IconTrash"
                :title="t('action.remove')"
                @click="deleteEntry(index)"
              />
            </div>
          </li>
        </ul>
        <p v-else class="text-center text-secondaryLight">
          No registrations found
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <HoppButtonSecondary
          :label="t('action.close')"
          filled
          outline
          @click="emit('hide-modal')"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import IconTrash from "~icons/lucide/trash"
import { useService } from "dioc/vue"
import { ref, watch } from "vue"
import { cloneDeep } from "lodash-es"
import { useI18n } from "@composables/i18n"
import { AgentInterceptorService } from "~/platform/std/interceptors/agent"

interface RegistrationEntry {
  registeredAt: Date
  maskedAuthKey: string
}

const t = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const nativeInterceptorService = useService(AgentInterceptorService)
const registrations = ref<RegistrationEntry[]>([])
const isLoading = ref(false)

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

watch(
  () => props.show,
  async (show) => {
    if (show) {
      isLoading.value = true
      try {
        await nativeInterceptorService.fetchRegistrations()
        registrations.value = cloneDeep(
          nativeInterceptorService.registrations?.value ?? []
        )
      } catch (error) {
        console.error("Failed to load registrations:", error)
      } finally {
        isLoading.value = false
      }
    }
  }
)

function deleteEntry(index: number) {
  registrations.value.splice(index, 1)
  nativeInterceptorService.registrations.value = registrations.value
}
</script>
