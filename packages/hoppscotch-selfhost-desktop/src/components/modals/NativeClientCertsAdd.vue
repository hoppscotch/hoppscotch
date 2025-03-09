<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="'Add Client Certificate'"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="space-y-4">
        <HoppSmartInput
          v-model="domain"
          :autofocus="false"
          styles="flex-1"
          placeholder=" "
          :label="'Domain'"
          input-styles="input floating-input"
        />

        <HoppSmartTabs v-model="selectedTab">
          <HoppSmartTab :id="'pem'" :label="'PEM'">
            <div class="p-4 space-y-4">
              <div class="flex flex-col space-y-2">
                <label> Certificate </label>
                <HoppButtonSecondary
                  :icon="pemCert?.type === 'loaded' ? IconFile : IconPlus"
                  :loading="pemCert?.type === 'loading'"
                  :label="
                    pemCert?.type === 'loaded'
                      ? pemCert.filename
                      : 'Add Certificate File'
                  "
                  filled
                  outline
                  @click="openFilePicker('pem_cert')"
                />
              </div>
              <div class="flex flex-col space-y-2">
                <label> Key </label>
                <HoppButtonSecondary
                  :icon="pemKey?.type === 'loaded' ? IconFile : IconPlus"
                  :loading="pemKey?.type === 'loading'"
                  :label="
                    pemKey?.type === 'loaded' ? pemKey.filename : 'Add Key File'
                  "
                  @click="openFilePicker('pem_key')"
                  filled
                  outline
                />
              </div>
            </div>
          </HoppSmartTab>

          <HoppSmartTab :id="'pfx'" :label="'PFX/PKCS12'">
            <div class="p-4 space-y-6">
              <div class="flex flex-col space-y-2">
                <label> PFX/PKCS12 File </label>
                <HoppButtonSecondary
                  :icon="pfxCert?.type === 'loaded' ? IconFile : IconPlus"
                  :loading="pfxCert?.type === 'loading'"
                  :label="
                    pfxCert?.type === 'loaded'
                      ? pfxCert.filename
                      : 'Add PFX/PKCS12 File'
                  "
                  @click="openFilePicker('pfx_cert')"
                  filled
                  outline
                />
              </div>

              <div class="border border-divider rounded">
                <HoppSmartInput
                  v-model="pfxPassword"
                  :type="showPfxPassword ? 'text' : 'password'"
                  :label="'Password'"
                  input-styles="floating-input !border-0 "
                  :placeholder="' '"
                >
                  <template #button>
                    <HoppButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="
                        showPfxPassword ? 'Hide Password' : 'Show Password'
                      "
                      :icon="showPfxPassword ? IconEye : IconEyeOff"
                      @click="showPfxPassword = !showPfxPassword"
                    />
                  </template>
                </HoppSmartInput>
              </div>
            </div>
          </HoppSmartTab>
        </HoppSmartTabs>
      </div>
    </template>

    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          :label="'Save'"
          :disabled="!isValidCertificate || anyFileSelectorIsLoading"
          @click="save"
        />
        <HoppButtonSecondary
          :label="'Cancel'"
          filled
          outline
          @click="emit('hide-modal')"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<!-- TODO: i18n -->
<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import IconEyeOff from "~icons/lucide/eye-off"
import IconEye from "~icons/lucide/eye"
import IconFile from "~icons/lucide/file"
import { ref, watch, computed } from "vue"
import { useFileDialog } from "@vueuse/core"
import { ClientCertificateEntry } from "../../platform/interceptors/native"
import { useToast } from "@composables/toast"

const toast = useToast()

const props = defineProps<{
  show: boolean
  existingDomains: string[]
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "save", certificate: ClientCertificateEntry): void
}>()

type FileSelectorState =
  | null
  | { type: "loading" }
  | { type: "loaded"; filename: string; data: Uint8Array }

const domain = ref("")

const pemCert = ref<FileSelectorState>(null)
const pemKey = ref<FileSelectorState>(null)

const pfxCert = ref<FileSelectorState>(null)

const pfxPassword = ref("")
const showPfxPassword = ref(false)

const anyFileSelectorIsLoading = computed(
  () =>
    pemCert.value?.type === "loading" ||
    pemKey.value?.type === "loading" ||
    pfxCert.value?.type === "loading"
)

const currentlyPickingFile = ref<null | "pem_cert" | "pem_key" | "pfx_cert">(
  null
)

const selectedTab = ref<"pem" | "pfx">("pem")

watch(
  () => props.show,
  (show) => {
    if (!show) return

    currentlyPickingFile.value = null

    domain.value = ""
    pemCert.value = null
    pemKey.value = null
    pfxCert.value = null
    pfxPassword.value = ""
    showPfxPassword.value = false
    selectedTab.value = "pem"
  }
)

const certificate = computed<ClientCertificateEntry | null>(() => {
  if (selectedTab.value === "pem") {
    if (pemCert.value?.type === "loaded" && pemKey.value?.type === "loaded") {
      return <ClientCertificateEntry>{
        domain: domain.value,
        enabled: true,
        cert: {
          PEMCert: {
            certificate_filename: pemCert.value.filename,
            certificate_pem: pemCert.value.data,

            key_filename: pemKey.value.filename,
            key_pem: pemKey.value.data,
          },
        },
      }
    }
  } else {
    if (pfxCert.value?.type === "loaded") {
      return <ClientCertificateEntry>{
        domain: domain.value.trim(),
        enabled: true,
        cert: {
          PFXCert: {
            certificate_filename: pfxCert.value.filename,
            certificate_pfx: pfxCert.value.data,
            password: pfxPassword.value,
          },
        },
      }
    }
  }

  return null
})

const isValidCertificate = computed(() => {
  if (certificate.value === null) return false

  if (props.existingDomains.includes(certificate.value.domain)) {
    toast.error("A certificate for this domain already exists")
    return false
  }

  return ClientCertificateEntry.safeParse(certificate.value).success
})

const {
  open: openFileDialog,
  reset: resetFilePicker,
  onChange: onFilePickerChange,
} = useFileDialog({
  reset: true,
  multiple: false,
})

onFilePickerChange(async (files) => {
  if (!files) return

  const file = files.item(0)

  if (!file) return

  if (currentlyPickingFile.value === "pem_cert") {
    pemCert.value = { type: "loading" }
  } else if (currentlyPickingFile.value === "pem_key") {
    pemKey.value = { type: "loading" }
  } else if (currentlyPickingFile.value === "pfx_cert") {
    pfxCert.value = { type: "loading" }
  }

  const data = new Uint8Array(await file.arrayBuffer())

  if (currentlyPickingFile.value === "pem_cert") {
    pemCert.value = { type: "loaded", filename: file.name, data }
  } else if (currentlyPickingFile.value === "pem_key") {
    pemKey.value = { type: "loaded", filename: file.name, data }
  } else if (currentlyPickingFile.value === "pfx_cert") {
    pfxCert.value = { type: "loaded", filename: file.name, data }
  }

  currentlyPickingFile.value = null

  resetFilePicker()
})

function openFilePicker(type: "pem_cert" | "pem_key" | "pfx_cert") {
  currentlyPickingFile.value = type

  openFileDialog()
}

function save() {
  if (certificate.value) {
    emit("save", certificate.value)
    emit("hide-modal")
  }
}
</script>
