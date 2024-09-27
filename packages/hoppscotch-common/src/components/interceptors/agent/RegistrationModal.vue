<template>
  <!-- TODO: i18n -->
  <HoppSmartModal
    v-if="show"
    dialog
    styles="sm:max-w-md"
    :title="modalTitle"
    @close="hideModal"
  >
    <template #body>
      <div class="space-y-4">
        <template v-if="status === 'agent_not_running'">
          <p class="text-secondaryLight">{{ t('agent.not_running') }}</p>
        </template>
        <template v-else-if="status === 'registration_required'">
          <template v-if="registrationStatus === 'initial'">
            <p class="text-secondaryLight">{{ t('agent.registration_instruction') }}</p>
          </template>
          <template v-else-if="registrationStatus === 'otp_required'">
            <p class="text-secondaryLight">{{ t('agent.enter_otp_instruction') }}</p>
            <HoppSmartInput
              v-model="userEnteredOTP"
              :placeholder="t('agent.enter_otp')"
              :label="t('agent.otp_label')"
              input-styles="input floating-input"
            />
          </template>
          <template v-else-if="registrationStatus === 'loading'">
            <div class="flex items-center space-x-2">
              <HoppButtonSecondary
                :icon="IconLoader"
                class="animate-spin"
                disabled
              />
              <p class="text-secondaryLight">{{ t('agent.processing') }}</p>
            </div>
          </template>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-start flex-1">
        <template v-if="status === 'agent_not_running'">
          <HoppButtonPrimary
            :label="t('action.retry')"
            :loading="loading"
            @click="retryConnection"
          />
        </template>
        <template v-else-if="status === 'registration_required'">
          <HoppButtonPrimary
            v-if="registrationStatus === 'initial'"
            :label="t('action.register')"
            :loading="registrationStatus === 'loading'"
            @click="register"
          />
          <HoppButtonPrimary
            v-if="registrationStatus === 'otp_required'"
            :label="t('action.verify')"
            :loading="registrationStatus === 'loading'"
            @click="verify"
          />
        </template>
        <HoppButtonSecondary
          :label="t('action.cancel')"
          class="ml-2"
          filled
          outline
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { ref, computed } from "vue"
import IconLoader from "~icons/lucide/loader"

const t = useI18n()
const userEnteredOTP = ref("")

const props = defineProps<{
  show: boolean
  status: 'agent_not_running' | 'registration_required' | 'hidden'
  registrationStatus: 'initial' | 'otp_required' | 'loading'
}>()

const modalTitle = computed(() => {
  switch (props.status) {
    case 'agent_not_running':
      return t('agent.not_running_title')
    case 'registration_required':
      return t('agent.registration_title')
    default:
      return ''
  }
})

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "register"): void
  (e: "verify", otp: string): void
  (e: "retry-connection"): void
}>()

function hideModal() {
  emit("hide-modal")
}

function register() {
  emit("register")
}

function verify() {
  emit("verify", userEnteredOTP.value)
}

function retryConnection() {
  emit("retry-connection")
}
</script>
