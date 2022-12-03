<template>
  <SmartModal v-if="show" dialog :title="t('mqtt.new')" @close="hideModal">
    <template #body>
      <div class="flex justify-between mb-4">
        <div
          class="flex items-center border divide-x rounded border-divider divide-divider"
        >
          <label class="mx-4">
            {{ t("mqtt.qos") }}
          </label>
          <tippy interactive trigger="click" theme="popover">
            <span class="select-wrapper">
              <ButtonSecondary class="pr-8" :label="`${QoS}`" />
            </span>
            <template #content="{ hide }">
              <div class="flex flex-col" role="menu">
                <SmartItem
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
          v-model="name"
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
            class="absolute inset-0 flex items-center justify-center group hover:cursor-pointer"
          >
            <icon-lucide-brush
              class="transition opacity-80 svg-icons group-hover:opacity-100 text-accentContrast"
            />
          </label>
          <input
            id="select-color"
            v-model="color"
            type="color"
            class="w-8 h-8 p-1 rounded bg-primary color-picker"
          />
        </span>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="t('mqtt.subscribe')"
          :loading="loadingState"
          outline
          @click="addNewSubscription"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
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

const QoS = ref<typeof QOS_VALUES[number]>(2)
const name = ref("")
const color = ref("#f58290")

watch(
  () => props.show,
  () => {
    name.value = ""
    QoS.value = 2
    const randomColor = Math.floor(Math.random() * 16777215).toString(16)
    color.value = `#${randomColor}`
  }
)

const addNewSubscription = () => {
  if (!name.value) {
    toastr.error(t("mqtt.invalid_topic").toString())
    return
  }
  emit("submit", {
    name: name.value,
    qos: QoS.value,
    color: color.value,
  })
}
const hideModal = () => {
  name.value = ""
  QoS.value = 2
  emit("hide-modal")
}
</script>
