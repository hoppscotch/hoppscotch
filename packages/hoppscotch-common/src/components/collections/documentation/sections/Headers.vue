<template>
  <div
    v-if="hasItems(headers) || hasItems(inheritedHeaders)"
    class="w-full space-y-2"
  >
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      <span>{{ t("documentation.headers.title") }}</span>
    </h2>
    <div class="px-4 py-2 flex flex-col">
      <div class="space-y-3">
        <div
          class="grid grid-cols-[8rem_16rem_1fr_12rem] gap-4 border-b border-divider pb-2 text-secondaryDark font-semibold items-center"
        >
          <span class="truncate">{{ t("documentation.key") }}</span>
          <span class="truncate">{{ t("documentation.value") }}</span>
          <span class="truncate">{{ t("documentation.description") }}</span>
          <span class="truncate"></span>
        </div>

        <template v-if="inheritedHeaders">
          <!-- Inherited Headers -->
          <div
            v-for="(header, index) in inheritedHeaders"
            :key="`inherited-${index}`"
            class="grid grid-cols-[8rem_16rem_1fr_12rem] gap-4 items-center"
          >
            <span
              class="font-medium text-secondaryDark truncate"
              :title="header.inheritedHeader.key"
              >{{ header.inheritedHeader.key }}</span
            >
            <span class="truncate" :title="header.inheritedHeader.value">{{
              header.inheritedHeader.value
            }}</span>
            <span
              class="text-xs text-secondaryLight truncate"
              :title="header.inheritedHeader.description"
            >
              {{ header.inheritedHeader.description }}
            </span>
            <div class="truncate">
              <span class="text-tiny text-secondaryLight">
                {{
                  t("documentation.inherited_from", { name: header.parentName })
                }}
              </span>
            </div>
          </div>
        </template>

        <!-- Request Headers -->
        <div
          v-for="(header, index) in headers"
          :key="index"
          class="grid grid-cols-[8rem_16rem_1fr_12rem] gap-4 items-center"
        >
          <span
            class="font-medium text-secondaryDark truncate"
            :title="header.key"
            >{{ header.key }}</span
          >
          <span class="truncate" :title="header.value">{{ header.value }}</span>
          <span
            class="text-xs text-secondaryLight truncate"
            :title="header.description"
          >
            {{ header.description }}
          </span>
          <div></div>
        </div>
        <div
          v-if="
            headers.length === 0 &&
            (!inheritedHeaders || inheritedHeaders.length === 0)
          "
          class="text-secondaryLight text-sm py-1"
        >
          {{ t("documentation.headers.no_headers") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTHeader } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const t = useI18n()

defineProps<{
  headers: HoppRESTHeader[]
  inheritedHeaders?: HoppInheritedProperty["headers"]
}>()

function hasItems<T>(value: T[] | undefined): boolean {
  return !!value && value.length > 0
}
</script>
