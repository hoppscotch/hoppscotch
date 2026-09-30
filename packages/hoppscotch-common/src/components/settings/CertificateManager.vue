<template>
  <div class="flex flex-col space-y-4">
    <div
      v-if="legacyClient"
      class="flex items-center justify-between gap-2 border border-divider rounded px-4 py-3"
    >
      <span class="truncate">
        {{ t("settings.legacy_client_certificate") }}
      </span>
      <HoppButtonSecondary
        :icon="IconTrash"
        :title="t('action.delete')"
        @click="confirmLegacyDelete = true"
      />
    </div>
    <!-- Certificate list -->
    <div v-if="modelValue.length > 0" class="border border-divider rounded">
      <div
        v-for="(entry, index) in modelValue"
        :key="entry.id"
        class="flex items-center justify-between px-4 py-3"
        :class="{ 'border-t border-divider': index !== 0 }"
      >
        <div class="flex flex-col min-w-0 flex-1">
          <span class="font-medium text-secondary truncate">
            {{ entry.hostname }}
          </span>
          <span class="text-tiny text-secondaryLight mt-0.5">
            {{ entry.kind.toUpperCase() }} ·
            {{
              entry.kind === "pem"
                ? (entry.cert?.name ?? t("settings.no_file_selected"))
                : (entry.data?.name ?? t("settings.no_file_selected"))
            }}
          </span>
        </div>
        <div class="flex items-center space-x-1 flex-shrink-0 ml-2">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconPencil"
            :title="t('action.edit')"
            @click="startEdit(entry)"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconTrash"
            :title="t('action.delete')"
            color="red"
            @click="confirmDeleteEntry(entry.id)"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <p
      v-else
      class="text-center text-secondaryLight text-sm py-4 border border-dashed border-dividerDark rounded"
    >
      {{ t("settings.no_client_certificates") }}
    </p>

    <!-- Add certificate button -->
    <HoppButtonSecondary
      :icon="IconPlus"
      :label="t('settings.add_client_certificate')"
      outline
      @click="startAdd"
    />
    <p v-if="certError && !showFormModal" class="text-red-500 text-sm">
      {{ certError }}
    </p>

    <!-- Add / Edit modal -->
    <HoppSmartModal
      v-if="showFormModal"
      dialog
      :title="
        editingId
          ? t('settings.edit_client_certificate')
          : t('settings.add_client_certificate')
      "
      @close="closeModal"
    >
      <template #body>
        <div class="p-4 space-y-4">
          <!-- Hostname -->
          <div class="border border-divider rounded">
            <HoppSmartInput
              v-model="form.hostname"
              :placeholder="'api.example.com'"
              :label="t('settings.client_certificate_hostname')"
              input-styles="floating-input !border-0"
            />
          </div>
          <p
            v-if="form.hostname && !normalizedHostname"
            class="text-red-500 text-sm mt-1"
          >
            {{ t("settings.invalid_certificate_hostname") }}
          </p>
          <p v-else-if="isDuplicateHostname" class="text-red-500 text-sm mt-1">
            {{ t("settings.duplicate_certificate_hostname") }}
          </p>

          <!-- Cert type tabs — use certKind ref (not form.kind directly) -->
          <HoppSmartTabs v-model="certKind">
            <HoppSmartTab id="pem" label="PEM">
              <div class="space-y-3 p-4">
                <!-- Certificate file -->
                <div class="flex flex-col space-y-2">
                  <label class="text-sm text-secondary">
                    {{ t("settings.certificate") }}
                    <span class="text-secondaryLight">(.pem, .crt)</span>
                  </label>
                  <HoppButtonSecondary
                    :icon="form.certFile ? IconFile : IconPlus"
                    :label="
                      form.certFile?.name ??
                      form.existingCert?.name ??
                      t('settings.select_file')
                    "
                    outline
                    @click="pickPEMCert"
                  />
                </div>
                <!-- Key file -->
                <div class="flex flex-col space-y-2">
                  <label class="text-sm text-secondary">
                    {{ t("settings.key") }}
                    <span class="text-secondaryLight">(.pem, .key)</span>
                  </label>
                  <HoppButtonSecondary
                    :icon="form.keyFile ? IconFile : IconPlus"
                    :label="
                      form.keyFile?.name ??
                      form.existingKey?.name ??
                      t('settings.select_file')
                    "
                    outline
                    @click="pickPEMKey"
                  />
                </div>
              </div>
            </HoppSmartTab>

            <HoppSmartTab id="pfx" label="PFX">
              <div class="space-y-3 p-4">
                <!-- PFX file -->
                <div class="flex flex-col space-y-2">
                  <label class="text-sm text-secondary">
                    {{ t("settings.certificate") }}
                    <span class="text-secondaryLight">(.pfx, .p12)</span>
                  </label>
                  <HoppButtonSecondary
                    :icon="form.pfxFile ? IconFile : IconPlus"
                    :label="
                      form.pfxFile?.name ??
                      form.existingPfxData?.name ??
                      t('settings.select_file')
                    "
                    outline
                    @click="pickPFXFile"
                  />
                </div>
                <!-- Passphrase -->
                <div class="border border-divider rounded">
                  <HoppSmartInput
                    v-model="form.passphrase"
                    :type="showPassphrase ? 'text' : 'password'"
                    :label="t('settings.client_certificate_passphrase')"
                    input-styles="floating-input !border-0"
                    :placeholder="' '"
                  >
                    <template #button>
                      <HoppButtonSecondary
                        v-tippy="{ theme: 'tooltip' }"
                        :title="
                          showPassphrase
                            ? t('hide.password')
                            : t('show.password')
                        "
                        :icon="showPassphrase ? IconEye : IconEyeOff"
                        @click="showPassphrase = !showPassphrase"
                      />
                    </template>
                  </HoppSmartInput>
                </div>
              </div>
            </HoppSmartTab>
          </HoppSmartTabs>

          <!-- Validation error — shows actual error detail -->
          <div
            v-if="certError"
            class="flex items-start space-x-2 text-red-500 text-sm"
          >
            <icon-lucide-alert-circle class="svg-icons flex-shrink-0 mt-0.5" />
            <span>{{ certError }}</span>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between w-full px-4 pb-4">
          <HoppButtonSecondary
            :label="t('action.cancel')"
            outline
            @click="closeModal"
          />
          <HoppButtonPrimary
            :label="t('action.save')"
            :disabled="!isFormValid || isSaving"
            :loading="isSaving"
            @click="saveEntry"
          />
        </div>
      </template>
    </HoppSmartModal>

    <!-- Delete confirmation modal -->
    <HoppSmartConfirmModal
      :show="!!confirmDeleteId || confirmLegacyDelete"
      :confirm="t('action.delete')"
      :title="t('settings.delete_certificate_confirm')"
      @hide-modal="cancelDelete"
      @resolve="deleteEntry"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from "vue"
import { useFileDialog } from "@vueuse/core"
import { useI18n } from "@composables/i18n"
import { encryptPassphrase } from "~/helpers/functional/cert-crypto"
import {
  type ClientCertEntry,
  normalizeCertificateHostname,
} from "~/helpers/functional/cert-registry"
import type { StoreFile } from "@hoppscotch/kernel"
import type { InputDomainSetting } from "~/helpers/functional/domain-settings"

import IconPlus from "~icons/lucide/plus"
import IconPencil from "~icons/lucide/pencil"
import IconTrash from "~icons/lucide/trash"
import IconFile from "~icons/lucide/file"
import IconEye from "~icons/lucide/eye"
import IconEyeOff from "~icons/lucide/eye-off"

const t = useI18n()

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  modelValue: ClientCertEntry[]
  save: (certs: ClientCertEntry[]) => Promise<void>
  legacyClient?: NonNullable<
    NonNullable<InputDomainSetting["security"]>["certificates"]
  >["client"]
  clearLegacy: () => Promise<void>
}>()

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

const showFormModal = ref(false)
const editingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const confirmLegacyDelete = ref(false)
const isSaving = ref(false)
const showPassphrase = ref(false)
const certError = ref<string | null>(null)

/**
 * Dedicated ref for HoppSmartTabs v-model — matches the pattern used in
 * Agent.vue / picker.ts. Keeps form.kind in sync via a watcher.
 */
const certKind = ref<"pem" | "pfx">("pem")
watch(certKind, (val) => {
  form.kind = val
})

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  hostname: string
  kind: "pem" | "pfx"
  certFile: File | null
  keyFile: File | null
  pfxFile: File | null
  passphrase: string
  existingCert?: StoreFile
  existingKey?: StoreFile
  existingPfxData?: StoreFile
}

const form = reactive<FormState>({
  hostname: "",
  kind: "pem",
  certFile: null,
  keyFile: null,
  pfxFile: null,
  passphrase: "",
})

const normalizedHostname = computed(() =>
  normalizeCertificateHostname(form.hostname)
)
const isDuplicateHostname = computed(
  () =>
    !!normalizedHostname.value &&
    props.modelValue.some(
      (entry) =>
        entry.id !== editingId.value &&
        entry.hostname === normalizedHostname.value
    )
)

const isFormValid = computed(() => {
  if (!normalizedHostname.value || isDuplicateHostname.value) return false
  if (form.kind === "pem") {
    const hasCert = !!form.certFile || !!form.existingCert
    const hasKey = !!form.keyFile || !!form.existingKey
    return hasCert && hasKey
  }
  return !!(form.pfxFile || form.existingPfxData)
})

// ---------------------------------------------------------------------------
// File pickers
// ---------------------------------------------------------------------------

const pemCertPicker = useFileDialog({
  accept: ".pem,.crt",
  reset: true,
  multiple: false,
})
const pemKeyPicker = useFileDialog({
  accept: ".pem,.key",
  reset: true,
  multiple: false,
})
const pfxPicker = useFileDialog({
  accept: ".pfx,.p12",
  reset: true,
  multiple: false,
})

pemCertPicker.onChange((files) => {
  const file = files?.item(0)
  if (file) {
    form.certFile = file
    form.existingCert = undefined
    certError.value = null
  }
  pemCertPicker.reset()
})
function pickPEMCert() {
  pemCertPicker.open()
}

pemKeyPicker.onChange((files) => {
  const file = files?.item(0)
  if (file) {
    form.keyFile = file
    form.existingKey = undefined
    certError.value = null
  }
  pemKeyPicker.reset()
})
function pickPEMKey() {
  pemKeyPicker.open()
}

pfxPicker.onChange((files) => {
  const file = files?.item(0)
  if (file) {
    form.pfxFile = file
    form.existingPfxData = undefined
    certError.value = null
  }
  pfxPicker.reset()
})
function pickPFXFile() {
  pfxPicker.open()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safe UUID generator — falls back to a random string if randomUUID is unavailable */
function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

function resetForm() {
  certKind.value = "pem"
  form.hostname = ""
  form.kind = "pem"
  form.certFile = null
  form.keyFile = null
  form.pfxFile = null
  form.passphrase = ""
  form.existingCert = undefined
  form.existingKey = undefined
  form.existingPfxData = undefined
  certError.value = null
  showPassphrase.value = false
}

async function fileToStoreFile(file: File): Promise<StoreFile> {
  return {
    include: true,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    content: new Uint8Array(await file.arrayBuffer()),
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function startAdd() {
  editingId.value = null
  resetForm()
  showFormModal.value = true
}

function startEdit(entry: ClientCertEntry) {
  editingId.value = entry.id
  resetForm()
  form.hostname = entry.hostname
  form.kind = entry.kind
  certKind.value = entry.kind

  if (entry.kind === "pem") {
    form.existingCert = entry.cert
    form.existingKey = entry.key
  } else {
    form.existingPfxData = entry.data
    form.passphrase = ""
  }
  showFormModal.value = true
}

function closeModal() {
  showFormModal.value = false
  resetForm()
  editingId.value = null
}

async function saveEntry() {
  if (!isFormValid.value) {
    certError.value = t("settings.certificate_save_error")
    return
  }
  isSaving.value = true
  certError.value = null

  try {
    const id = editingId.value ?? generateId()
    const hostname = normalizedHostname.value
    if (!hostname) throw new Error("Invalid certificate hostname")

    let newEntry: ClientCertEntry

    if (form.kind === "pem") {
      const cert = form.certFile
        ? await fileToStoreFile(form.certFile)
        : form.existingCert
      const key = form.keyFile
        ? await fileToStoreFile(form.keyFile)
        : form.existingKey

      if (!cert || !key) throw new Error("Missing PEM certificate or key")
      newEntry = { id, hostname, kind: "pem", cert, key }
    } else {
      const data = form.pfxFile
        ? await fileToStoreFile(form.pfxFile)
        : form.existingPfxData

      if (!data) throw new Error("Missing PFX certificate")
      let encryptedPassphrase = ""
      if (form.passphrase) {
        encryptedPassphrase = await encryptPassphrase(form.passphrase)
      } else if (editingId.value) {
        // Keep existing encrypted passphrase if user left the field blank while editing
        const existing = props.modelValue.find((e) => e.id === editingId.value)
        if (existing && existing.kind === "pfx") {
          encryptedPassphrase = existing.passphrase ?? ""
        }
      }

      newEntry = {
        id,
        hostname,
        kind: "pfx",
        data,
        passphrase: encryptedPassphrase,
      }
    }

    const updated = editingId.value
      ? props.modelValue.map((e) => (e.id === editingId.value ? newEntry : e))
      : [...props.modelValue, newEntry]

    await props.save(updated)
    closeModal()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    certError.value = `${t("settings.certificate_save_error")} (${message})`
    console.error("[CertificateManager] saveEntry error:", err)
  } finally {
    isSaving.value = false
  }
}

function confirmDeleteEntry(id: string) {
  confirmDeleteId.value = id
}

function cancelDelete() {
  confirmDeleteId.value = null
  confirmLegacyDelete.value = false
}

async function deleteEntry() {
  if (!confirmDeleteId.value && !confirmLegacyDelete.value) return
  try {
    if (confirmLegacyDelete.value) {
      await props.clearLegacy()
    } else {
      await props.save(
        props.modelValue.filter((e) => e.id !== confirmDeleteId.value)
      )
    }
    cancelDelete()
  } catch (err) {
    certError.value = `${t("settings.certificate_save_error")} (${String(err)})`
    console.error("[CertificateManager] deleteEntry error:", err)
  }
}
</script>
