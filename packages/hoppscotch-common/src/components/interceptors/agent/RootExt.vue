<template>
  <InterceptorsAgentRegistrationModal
    :show="showModal"
    :status="modalStatus"
    :registration-status="registrationStatus"
    @hide-modal="hideModal"
    @register="register"
    @verify="verifyOTP"
    @retry-connection="checkAgentStatus"
  />
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { AgentInterceptorService } from "~/platform/std/interceptors/agent"
import { ref, onMounted, computed, watch } from "vue"
import { useToast } from "@composables/toast"
import { InterceptorService } from "~/services/interceptor.service"

// TODO: Move as much as logic as possible to AgentInterceptorService

const interceptorService = useService(InterceptorService) // TODO: Try to remove dependency to InterceptorService
const agentService = useService(AgentInterceptorService)
const showModal = ref(false)
const toast = useToast()

const modalStatus = computed(() => {
  if (!agentService.isAgentRunning.value) return "agent_not_running"
  if (!agentService.isAuthKeyPresent()) return "registration_required"
  return "hidden"
})

const registrationStatus = ref<"initial" | "otp_required" | "loading">(
  "initial"
)

async function checkAgentStatus() {
  if (
    interceptorService.currentInterceptor.value?.interceptorID ===
    agentService.interceptorID
  ) {
    await agentService.checkAgentStatus()
    updateModalVisibility()
  }
}

watch(interceptorService.currentInterceptor, () => {
  checkAgentStatus()
})

function updateModalVisibility() {
  showModal.value = modalStatus.value !== "hidden"
  if (showModal.value && modalStatus.value === "registration_required") {
    registrationStatus.value = "initial"
  }
}

onMounted(async () => {
  await checkAgentStatus()
})

function hideModal() {
  showModal.value = false
}

async function register() {
  registrationStatus.value = "loading"
  try {
    await agentService.initiateRegistration()
    registrationStatus.value = "otp_required"
  } catch (error) {
    toast.error("Failed to initiate registration. Please try again.")
    registrationStatus.value = "initial"
  }
}

async function verifyOTP(otp: string) {
  registrationStatus.value = "loading"
  try {
    await agentService.verifyRegistration(otp)
    toast.success("Registration successful!")
    hideModal()
  } catch (error) {
    toast.error("Failed to verify OTP. Please try again.")
    registrationStatus.value = "otp_required"
  }
}
</script>
