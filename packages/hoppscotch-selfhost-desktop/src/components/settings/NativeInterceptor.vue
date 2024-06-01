<template>
  <div class="py-4 space-y-4">
    <div class="flex items-center">
      <HoppSmartToggle />
      Skip SSL Certificate Verification
    </div>

    <div class="flex space-x-4">
      <HoppButtonSecondary
        :icon="IconLucideFileBadge"
        :label="'CA Certificates'"
        outline
        @click="showCACertificatesModal = true"
      />
      <HoppButtonSecondary
        :icon="IconLucideFileKey"
        :label="'Client Certificates'"
        @click="showClientCertificatesModal = true"
        outline
      />
    </div>

    <ModalsNativeCACertificates
      :show="showCACertificatesModal"
      @hide-modal="showCACertificatesModal = false"
    />
    <ModalsNativeClientCertificates
      :show="showClientCertificatesModal"
      @hide-modal="showClientCertificatesModal = false"
    />
  </div>
</template>

<!-- TODO: i18n -->
<script setup lang="ts">
import { ref } from "vue"
import IconLucideFileBadge from "~icons/lucide/file-badge"
import IconLucideFileKey from "~icons/lucide/file-key"

const showCACertificatesModal = ref(false)
const showClientCertificatesModal = ref(false)
</script>

