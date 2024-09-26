<template>
  <div class="py-4 space-y-4">
    <div class="flex items-center">
      <HoppSmartToggle
        :on="allowSSLVerification"
        @change="allowSSLVerification = !allowSSLVerification"
      />
      Verify SSL Certificates
    </div>

    <div class="flex space-x-4">
      <!--
      <HoppButtonSecondary
        :icon="IconLucideFileBadge"
        :label="'CA Certificates'"
        outline
        @click="showCACertificatesModal = true"
      />
      -->
      <HoppButtonSecondary
        :icon="IconLucideFileKey"
        :label="'Client Certificates'"
        outline
        @click="showClientCertificatesModal = true"
      />
    </div>

    <!--
    <ModalsNativeCACertificates
      :show="showCACertificatesModal"
      @hide-modal="showCACertificatesModal = false"
    />
    -->

    <!-- TODO: Port over the modals -->
    <ModalsNativeClientCertificates
      :show="showClientCertificatesModal"
      @hide-modal="showClientCertificatesModal = false"
    />

    <!-- TODO: Implement Proxy Settings -->
  </div>
</template>

<!-- TODO: i18n -->
<script setup lang="ts">
import { ref } from "vue"
// import IconLucideFileBadge from "~icons/lucide/file-badge"
import IconLucideFileKey from "~icons/lucide/file-key"
import { useService } from "dioc/vue"
import { AgentInterceptorService } from "~/platform/std/interceptors/agent"

const agentInterceptorService = useService(AgentInterceptorService)

const allowSSLVerification = agentInterceptorService.validateCerts

// const showCACertificatesModal = ref(false)
const showClientCertificatesModal = ref(false)
</script>
