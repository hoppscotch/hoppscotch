<template>
  <AppSection label="bodyParameters">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-upperSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("request.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="$t('app.wiki')"
          icon="help_outline"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear_all')"
          icon="clear_all"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('add.new')"
          icon="add"
          @click.native="addBodyParam"
        />
      </div>
    </div>
    <div
      v-for="(param, index) in bodyParams"
      :key="`param-${index}`"
      class="divide-x divide-dividerLight border-b border-dividerLight flex"
    >
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED"
        v-model="param.key"
        :placeholder="$t('count.parameter', { count: index + 1 })"
        styles="
          bg-primaryLight
          flex
          flex-1
          py-1
          px-4
        "
        @change="
          updateBodyParam(index, {
            key: $event,
            value: param.value,
            active: param.active,
            isFile: param.isFile,
          })
        "
      />
      <input
        v-else
        class="bg-primaryLight flex flex-1 py-2 px-4"
        :placeholder="$t('count.parameter', { count: index + 1 })"
        :name="'param' + index"
        :value="param.key"
        autofocus
        @change="
          updateBodyParam(index, {
            key: $event.target.value,
            value: param.value,
            active: param.active,
            isFile: param.isFile,
          })
        "
      />
      <div v-if="param.isFile" class="file-chips-container hide-scrollbar">
        <div class="space-x-2 file-chips-wrapper">
          <SmartDeletableChip
            v-for="(file, fileIndex) in param.value"
            :key="`param-${index}-file-${fileIndex}`"
            @chip-delete="chipDelete(index, fileIndex)"
          >
            {{ file.name }}
          </SmartDeletableChip>
        </div>
      </div>
      <span v-else class="flex flex-1">
        <SmartEnvInput
          v-if="EXPERIMENTAL_URL_BAR_ENABLED"
          v-model="param.value"
          :placeholder="$t('count.value', { count: index + 1 })"
          styles="
          bg-primaryLight
          flex
          flex-1
          py-1
          px-4
        "
          @change="
            updateBodyParam(index, {
              key: param.key,
              value: $event,
              active: param.active,
              isFile: param.isFile,
            })
          "
        />
        <input
          v-else
          class="bg-primaryLight flex flex-1 py-2 px-4"
          :placeholder="$t('count.value', { count: index + 1 })"
          :name="'value' + index"
          :value="param.value"
          @change="
            updateBodyParam(index, {
              key: param.key,
              value: $event.target.value,
              active: param.active,
              isFile: param.isFile,
            })
          "
        />
      </span>
      <span>
        <label for="attachment" class="p-0">
          <ButtonSecondary
            class="w-full"
            icon="attach_file"
            @click.native="$refs.attachment[index].click()"
          />
        </label>
        <input
          ref="attachment"
          class="input"
          name="attachment"
          type="file"
          multiple
          @change="setRequestAttachment(index, param, $event)"
        />
      </span>
      <span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="
            param.hasOwnProperty('active')
              ? param.active
                ? $t('action.turn_off')
                : $t('action.turn_on')
              : $t('action.turn_off')
          "
          :icon="
            param.hasOwnProperty('active')
              ? param.active
                ? 'check_circle_outline'
                : 'radio_button_unchecked'
              : 'check_circle_outline'
          "
          color="green"
          @click.native="
            updateBodyParam(index, {
              key: param.key,
              value: param.value,
              active: param.hasOwnProperty('active') ? !param.active : false,
              isFile: param.isFile,
            })
          "
        />
      </span>
      <span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.remove')"
          icon="remove_circle_outline"
          color="red"
          @click.native="deleteBodyParam(index)"
        />
      </span>
    </div>
    <div
      v-if="bodyParams.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <span class="text-center pb-4">
        {{ $t("empty.body") }}
      </span>
      <ButtonSecondary
        :label="$t('add.new')"
        filled
        icon="add"
        @click.native="addBodyParam"
      />
    </div>
  </AppSection>
</template>

<script lang="ts">
import { defineComponent, onMounted, Ref, watch } from "@nuxtjs/composition-api"
import { FormDataKeyValue } from "~/helpers/types/HoppRESTRequest"
import { pluckRef } from "~/helpers/utils/composables"
import {
  addFormDataEntry,
  deleteAllFormDataEntries,
  deleteFormDataEntry,
  updateFormDataEntry,
  useRESTRequestBody,
} from "~/newstore/RESTSession"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  setup() {
    const bodyParams = pluckRef<any, any>(useRESTRequestBody(), "body") as Ref<
      FormDataKeyValue[]
    >

    const addBodyParam = () => {
      addFormDataEntry({ key: "", value: "", active: true, isFile: false })
    }

    const updateBodyParam = (index: number, entry: FormDataKeyValue) => {
      updateFormDataEntry(index, entry)
    }

    const deleteBodyParam = (index: number) => {
      deleteFormDataEntry(index)
    }

    const clearContent = () => {
      deleteAllFormDataEntries()
    }

    const chipDelete = (paramIndex: number, fileIndex: number) => {
      const entry = bodyParams.value[paramIndex]
      if (entry.isFile) {
        entry.value.splice(fileIndex, 1)
        if (entry.value.length === 0) {
          updateFormDataEntry(paramIndex, {
            ...entry,
            isFile: false,
            value: "",
          })
          return
        }
      }

      updateFormDataEntry(paramIndex, entry)
    }

    const setRequestAttachment = (
      index: number,
      entry: FormDataKeyValue,
      event: InputEvent
    ) => {
      console.log(index, event)

      const fileEntry: FormDataKeyValue = {
        ...entry,
        isFile: true,
        value: Array.from((event.target as HTMLInputElement).files!),
      }
      updateFormDataEntry(index, fileEntry)
    }

    watch(
      bodyParams,
      () => {
        if (
          bodyParams.value.length > 0 &&
          (bodyParams.value[bodyParams.value.length - 1].key !== "" ||
            bodyParams.value[bodyParams.value.length - 1].value !== "")
        )
          addBodyParam()
      },
      { deep: true }
    )

    onMounted(() => {
      if (!bodyParams.value?.length) {
        addBodyParam()
      }
    })

    return {
      bodyParams,
      addBodyParam,
      updateBodyParam,
      deleteBodyParam,
      clearContent,
      setRequestAttachment,
      chipDelete,
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
    }
  },
})
</script>

<style scoped lang="scss">
.file-chips-container {
  @apply flex flex-1;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-primaryLight;

  .file-chips-wrapper {
    @apply flex;
    @apply px-4;
    @apply py-1;
    @apply w-0;
  }
}
</style>
