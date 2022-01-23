<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperTertiaryStickyFold"
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
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear_all')"
          svg="trash-2"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('add.new')"
          svg="plus"
          @click.native="addBodyParam"
        />
      </div>
    </div>
    <div
      v-for="(param, index) in workingParams"
      :key="`param-${index}`"
      class="flex border-b divide-x divide-dividerLight border-dividerLight"
    >
      <SmartEnvInput
        v-model="param.key"
        :placeholder="`${$t('count.parameter', { count: index + 1 })}`"
        styles="
          bg-transparent
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
      <div v-if="param.isFile" class="file-chips-container hide-scrollbar">
        <div class="space-x-2 file-chips-wrapper">
          <SmartFileChip
            v-for="(file, fileIndex) in param.value"
            :key="`param-${index}-file-${fileIndex}`"
          >
            {{ file.name }}
          </SmartFileChip>
        </div>
      </div>
      <span v-else class="flex flex-1">
        <SmartEnvInput
          v-model="param.value"
          :placeholder="`${$t('count.value', { count: index + 1 })}`"
          styles="
            bg-transparent
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
      </span>
      <span>
        <label :for="`attachment${index}`" class="p-0">
          <input
            :id="`attachment${index}`"
            :ref="`attachment${index}`"
            :name="`attachment${index}`"
            type="file"
            multiple
            class="p-1 transition cursor-pointer file:transition file:cursor-pointer text-secondaryLight hover:text-secondaryDark file:mr-2 file:py-1 file:px-4 file:rounded file:border-0 file:text-tiny text-tiny file:text-secondary hover:file:text-secondaryDark file:bg-primaryLight hover:file:bg-primaryDark"
            @change="setRequestAttachment(index, param, $event)"
          />
        </label>
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
          :svg="
            param.hasOwnProperty('active')
              ? param.active
                ? 'check-circle'
                : 'circle'
              : 'check-circle'
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
          svg="trash"
          color="red"
          @click.native="deleteBodyParam(index)"
        />
      </span>
    </div>
    <div
      v-if="bodyParams.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/upload_single_file.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${$t('empty.body')}`"
      />
      <span class="pb-4 text-center">
        {{ $t("empty.body") }}
      </span>
      <ButtonSecondary
        :label="`${$t('add.new')}`"
        filled
        svg="plus"
        class="mb-4"
        @click.native="addBodyParam"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch } from "@nuxtjs/composition-api"
import { FormDataKeyValue } from "@hoppscotch/data"
import isEqual from "lodash/isEqual"
import { clone } from "lodash"
import { pluckRef, useI18n, useToast } from "~/helpers/utils/composables"
import { useRESTRequestBody } from "~/newstore/RESTSession"

const t = useI18n()

const toast = useToast()

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

const bodyParams = pluckRef<any, any>(useRESTRequestBody(), "body") as Ref<
  FormDataKeyValue[]
>

// The UI representation of the parameters list (has the empty end param)
const workingParams = ref<FormDataKeyValue[]>([
  {
    key: "",
    value: "",
    active: true,
    isFile: false,
  },
])

// Rule: Working Params always have last element is always an empty param
watch(workingParams, (paramsList) => {
  if (paramsList.length > 0 && paramsList[paramsList.length - 1].key !== "") {
    workingParams.value.push({
      key: "",
      value: "",
      active: true,
      isFile: false,
    })
  }
})

// Sync logic between params and working params
watch(
  bodyParams,
  (newParamsList) => {
    // Sync should overwrite working params
    const filteredWorkingParams = workingParams.value.filter(
      (e) => e.key !== ""
    )

    if (!isEqual(newParamsList, filteredWorkingParams)) {
      workingParams.value = newParamsList
    }
  },
  { immediate: true }
)

watch(workingParams, (newWorkingParams) => {
  const fixedParams = newWorkingParams.filter((e) => e.key !== "")
  if (!isEqual(bodyParams.value, fixedParams)) {
    bodyParams.value = fixedParams
  }
})

const addBodyParam = () => {
  workingParams.value.push({
    key: "",
    value: "",
    active: true,
    isFile: false,
  })
}

const updateBodyParam = (index: number, param: FormDataKeyValue) => {
  workingParams.value = workingParams.value.map((h, i) =>
    i === index ? param : h
  )
}

const deleteBodyParam = (index: number) => {
  const paramsBeforeDeletion = clone(workingParams.value)

  if (
    !(
      paramsBeforeDeletion.length > 0 &&
      index === paramsBeforeDeletion.length - 1
    )
  ) {
    if (deletionToast.value) {
      deletionToast.value.goAway(0)
      deletionToast.value = null
    }

    deletionToast.value = toast.success(`${t("state.deleted")}`, {
      action: [
        {
          text: `${t("action.undo")}`,
          onClick: (_, toastObject) => {
            workingParams.value = paramsBeforeDeletion
            toastObject.goAway(0)
            deletionToast.value = null
          },
        },
      ],

      onComplete: () => {
        deletionToast.value = null
      },
    })
  }

  workingParams.value.splice(index, 1)
}

const clearContent = () => {
  // set params list to the initial state
  workingParams.value = [
    {
      key: "",
      value: "",
      active: true,
      isFile: false,
    },
  ]
}

const setRequestAttachment = (
  index: number,
  entry: FormDataKeyValue,
  event: InputEvent
) => {
  // check if file exists or not
  if ((event.target as HTMLInputElement).files?.length === 0) {
    updateBodyParam(index, {
      ...entry,
      isFile: false,
      value: "",
    })
    return
  }

  const fileEntry: FormDataKeyValue = {
    ...entry,
    isFile: true,
    value: Array.from((event.target as HTMLInputElement).files!),
  }
  updateBodyParam(index, fileEntry)
}
</script>

<style scoped lang="scss">
.file-chips-container {
  @apply flex flex-1;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-transparent;

  .file-chips-wrapper {
    @apply flex;
    @apply p-1;
    @apply w-0;
  }
}
</style>
