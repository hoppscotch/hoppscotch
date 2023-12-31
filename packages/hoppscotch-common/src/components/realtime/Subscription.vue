<template>
  <HoppSmartModal v-if="show" dialog :title="t('mqtt.new')" @close="hideModal">
    <template #body>
      <div class="mb-4 flex justify-between">
        <div
          class="flex items-center divide-x divide-divider rounded border border-divider"
        >
          <label class="mx-4">
            {{ t("mqtt.qos") }}
          </label>
          <tippy interactive trigger="click" theme="popover">
            <HoppSmartSelectWrapper>
              <HoppButtonSecondary class="pr-8" :label="`${QoS}`" />
            </HoppSmartSelectWrapper>
            <template #content="{ hide }">
              <div class="flex flex-col" role="menu">
                <HoppSmartItem
                  v-for="item in QOS_VALUES"
                  :key="`qos-${item}`"
                  :label="`${item}`"
                  :icon="QoS === item ? IconCheckCircle : IconCircle"
                  :active="QoS === item"
                  @click="
                    () => {
                      QoS = item
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </div>
      </div>
      <div class="relative flex flex-col">
        <input
          id="selectLabelAdd"
          v-model="editingName"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addNewSubscription"
        />
        <label for="selectLabelAdd">
          {{ t("action.label") }}
        </label>
        <span class="end-actions">
          <label
            v-tippy="{ theme: 'tooltip' }"
            :title="t('mqtt.color')"
            for="select-color"
            class="group absolute inset-0 flex items-center justify-center hover:cursor-pointer"
          >
            <icon-lucide-brush
              class="svg-icons text-accentContrast opacity-80 transition group-hover:opacity-100"
            />
          </label>
          <input
            id="select-color"
            v-model="color"
            type="color"
            class="color-picker h-8 w-8 rounded bg-primary p-1"
          />
        </span>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('mqtt.subscribe')"
          :loading="loadingState"
          outline
          @click="addNewSubscription"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts" setup>
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import { ref, watch } from "vue"
import { MQTTTopic, QOS_VALUES } from "~/helpers/realtime/MQTTConnection"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const toastr = useToast()
const t = useI18n()

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  loadingState: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "submit", body: MQTTTopic): void
}>()

const QoS = ref<(typeof QOS_VALUES)[number]>(2)
const editingName = ref("")
const color = ref("#f58290")

watch(
  () => props.show,
  () => {
    editingName.value = ""
    QoS.value = 2
    const randomColor = Math.floor(Math.random() * 16777215).toString(16)
    color.value = `#${randomColor}`
  }
)

const addNewSubscription = () => {
  if (!editingName.value) {
    toastr.error(t("mqtt.invalid_topic").toString())
    return
  }
  emit("submit", {
    name: editingName.value,
    qos: QoS.value,
    color: color.value,
  })
}
const hideModal = () => {
  editingName.value = ""
  QoS.value = 2
  emit("hide-modal")
}
</script>
