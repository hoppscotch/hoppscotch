<template>
  <AppSection label="parameters">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-24
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold">
        {{ $t("parameter_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear_all')"
          icon="clear_all"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('add_new')"
          icon="add"
          @click.native="addParam"
        />
      </div>
    </div>
    <div
      v-for="(param, index) in params$"
      :key="`param-${index}`"
      class="divide-x divide-dividerLight border-b border-dividerLight flex"
      :class="{ 'border-t': index == 0 }"
    >
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED"
        v-model="param.key"
        :placeholder="$t('parameter_count', { count: index + 1 })"
        styles="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-1
          px-4
          focus:outline-none
        "
        @change="
          updateParam(index, {
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
          flex
          font-semibold font-mono
          flex-1
          py-2
          px-4
          focus:outline-none
        "
        :placeholder="$t('parameter_count', { count: index + 1 })"
        :name="'param' + index"
        :value="param.key"
        autofocus
        @change="
          updateParam(index, {
            key: $event.target.value,
            value: param.value,
            active: param.active,
          })
        "
      />
      <SmartEnvInput
        v-if="EXPERIMENTAL_URL_BAR_ENABLED"
        v-model="param.value"
        :placeholder="$t('value_count', { count: index + 1 })"
        styles="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-1
          px-4
          focus:outline-none
        "
        @change="
          updateParam(index, {
            key: param.key,
            value: $event.target.value,
            active: param.active,
          })
        "
      />
      <input
        v-else
        class="
          bg-primaryLight
          flex
          font-semibold font-mono
          flex-1
          py-2
          px-4
          focus:outline-none
        "
        :placeholder="$t('value_count', { count: index + 1 })"
        :name="'value' + index"
        :value="param.value"
        @change="
          updateParam(index, {
            key: param.key,
            value: $event.target.value,
            active: param.active,
          })
        "
      />
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="
            param.hasOwnProperty('active')
              ? param.active
                ? $t('turn_off')
                : $t('turn_on')
              : $t('turn_off')
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
            updateParam(index, {
              key: param.key,
              value: param.value,
              active: param.hasOwnProperty('active') ? !param.active : false,
            })
          "
        />
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('delete')"
          icon="delete"
          color="red"
          @click.native="deleteParam(index)"
        />
      </div>
    </div>
    <div
      v-if="params$.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">post_add</i>
      <span class="text-center pb-4">
        {{ $t("parameters_empty") }}
      </span>
      <ButtonSecondary
        :label="$t('add_new')"
        outline
        @click.native="addParam"
      />
    </div>
  </AppSection>
</template>

<script>
import {
  restParams$,
  addRESTParam,
  updateRESTParam,
  deleteRESTParam,
  deleteAllRESTParams,
} from "~/newstore/RESTSession"
import { getSettingSubject } from "~/newstore/settings"

export default {
  data() {
    return {
      params$: [],
    }
  },
  subscriptions() {
    return {
      params$: restParams$,
      EXPERIMENTAL_URL_BAR_ENABLED: getSettingSubject(
        "EXPERIMENTAL_URL_BAR_ENABLED"
      ),
    }
  },
  watch: {
    params$: {
      handler(newValue) {
        if (
          (newValue[newValue.length - 1]?.key !== "" ||
            newValue[newValue.length - 1]?.value !== "") &&
          newValue.length
        )
          this.addParam()
      },
      deep: true,
    },
  },
  mounted() {
    if (!this.params$?.length) {
      this.addParam()
    }
  },
  methods: {
    addParam() {
      addRESTParam({ key: "", value: "", active: true })
    },
    updateParam(index, item) {
      updateRESTParam(index, item)
    },
    deleteParam(index) {
      deleteRESTParam(index)
    },
    clearContent() {
      deleteAllRESTParams()
    },
  },
}
</script>
