<template>
  <InterceptorsAgentRegistrationModal
    :show="showModal"
    @hide-modal="showModal = false"
  />
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { AgentInterceptorService } from "~/platform/std/interceptors/agent"

const agentService = useService(AgentInterceptorService)

const showModal = agentService.showRegistrationModal
</script>
