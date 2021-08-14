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
        {{ $t("request_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/"
          blank
          :title="$t('wiki')"
          icon="help_outline"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
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
    <!-- <div v-if="typeof bodyParams !== 'string'"> -->
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
          focus:outline-none
        "
        @change="
          updateBodyParam(index, {
            key: $event.target.value,
            value: param.value,
            active: param.active,
          })
        "
      />
      <input
        v-else
        class="
          bg-primaryLight
          flex flex-1
          py-2
          px-4
          truncate
          focus:outline-none
        "
        :placeholder="$t('count.parameter', { count: index + 1 })"
        :name="'param' + index"
        :value="param.key"
        autofocus
        @change="
          updateBodyParam(index, {
            key: $event.target.value,
            value: param.value,
            active: param.active,
          })
        "
      />
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED && !param.isFile"
        v-model="param.value"
        :placeholder="$t('count.value', { count: index + 1 })"
        styles="
          bg-primaryLight
          flex
          flex-1
          py-1
          px-4
          focus:outline-none
        "
        @change="
          updateBodyParam(index, {
            key: param.key,
            value: $event.target.value,
            active: param.active,
          })
        "
      />
      <input
        v-if="!EXPERIMENTAL_URL_BAR_ENABLED && !param.isFile"
        class="
          bg-primaryLight
          flex flex-1
          py-2
          px-4
          truncate
          focus:outline-none
        "
        :placeholder="$t('count.value', { count: index + 1 })"
        :name="'value' + index"
        :value="param.value"
        @change="
          updateBodyParam(index, {
            key: param.key,
            value: $event.target.value,
            active: param.active,
          })
        "
      />
      <div v-else class="file-chips-container">
        <div class="file-chips-wrapper">
          <SmartDeletableChip
            v-for="(file, fileIndex) in Array.from(bodyParams[index].value)"
            :key="`param-${index}-file-${fileIndex}`"
            @chip-delete="chipDelete(index, fileIndex)"
          >
            {{ file.name }}
          </SmartDeletableChip>
        </div>
      </div>
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
                ? 'check_box'
                : 'check_box_outline_blank'
              : 'check_box'
          "
          color="green"
          @click.native="
            updateBodyParam(index, {
              key: param.key,
              value: param.value,
              active: param.hasOwnProperty('active') ? !param.active : false,
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
          @change="setRequestAttachment($event, index)"
        />
      </span>
      <span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('delete')"
          icon="delete"
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
        outline
        icon="add"
        @click.native="addBodyParam"
      />
    </div>
    <!-- </div> -->
  </AppSection>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "@nuxtjs/composition-api"
import { pluckRef } from "~/helpers/utils/composables"
import { addFormDataEntry, useRESTRequestBody } from "~/newstore/RESTSession"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  setup() {
    const bodyParams = pluckRef(useRESTRequestBody(), "body")

    onMounted(() => {
      console.log(bodyParams.value)
    })
    return {
      bodyParams,
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
    }
  },
  methods: {
    addBodyParam() {
      addFormDataEntry({ key: "", value: "", active: true, isFile: false })
    },
    updateBodyParam() {},
  },
})
</script>

<style scoped lang="scss">
.file-chips-container {
  @apply flex flex-1;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-primaryDark;

  .file-chips-wrapper {
    @apply flex;
    @apply w-0;
  }
}
</style>
