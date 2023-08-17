<template>
  <div v-if="inspectionResults && inspectionResults.length > 0">
    <tippy interactive trigger="click" theme="popover">
      <div class="flex justify-center items-center flex-1 flex-col">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconAlertTriangle"
          :class="severityColor(getHighestSeverity.severity)"
          :title="t('inspections.description')"
        />
      </div>
      <template #content="{ hide }">
        <div class="flex flex-col space-y-2 items-start flex-1">
          <div
            class="flex justify-between border rounded pl-2 border-divider bg-popover sticky top-0 self-stretch"
          >
            <span class="flex items-center flex-1">
              <icon-lucide-activity class="mr-2 svg-icons text-accent" />
              <span class="font-bold">
                {{ t("inspections.title") }}
              </span>
            </span>
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/features/inspections"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </div>
          <div
            v-for="(inspector, index) in inspectionResults"
            :key="index"
            class="flex self-stretch"
          >
            <div
              class="flex flex-col flex-1 rounded border border-dashed border-dividerDark divide-y divide-dashed divide-dividerDark"
            >
              <span
                v-if="inspector.text.type === 'text'"
                class="flex-1 px-3 py-2"
              >
                {{ inspector.text.text }}
                <HoppSmartLink
                  blank
                  :to="inspector.doc.link"
                  class="text-accent hover:text-accentDark transition"
                >
                  {{ inspector.doc.text }}
                  <icon-lucide-arrow-up-right class="svg-icons" />
                </HoppSmartLink>
              </span>
              <span v-if="inspector.action" class="flex p-2 space-x-2">
                <HoppButtonSecondary
                  :label="inspector.action.text"
                  outline
                  filled
                  @click="
                    () => {
                      inspector.action?.apply()
                      hide()
                    }
                  "
                />
              </span>
            </div>
          </div>
        </div>
      </template>
    </tippy>
  </div>
</template>

<script lang="ts" setup>
import { InspectorResult } from "~/services/inspection"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import IconHelpCircle from "~icons/lucide/help-circle"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  inspectionResults: InspectorResult[] | undefined
}>()

const getHighestSeverity = computed(() => {
  if (props.inspectionResults) {
    return props.inspectionResults.reduce(
      (prev, curr) => {
        return prev.severity > curr.severity ? prev : curr
      },
      { severity: 0 }
    )
  } else {
    return { severity: 0 }
  }
})

const severityColor = (severity: number) => {
  switch (severity) {
    case 1:
      return "!text-green-500 hover:!text-green-600"
    case 2:
      return "!text-yellow-500 hover:!text-yellow-600"
    case 3:
      return "!text-red-500 hover:!text-red-600"
    default:
      return "!text-gray-500 hover:!text-gray-600"
  }
}
</script>
