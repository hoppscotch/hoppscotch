<template>
  <AppSection label="parameters">
    <div
      class="
        sticky
        top-110px
        z-10
        bg-primary
        flex flex-1
        items-center
        justify-between
        pl-4
        border-b border-dividerLight
      "
    >
      <label for="paramList" class="font-semibold text-xs">
        {{ $t("parameter_list") }}
      </label>
      <div>
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
      class="
        flex
        border-b border-dashed
        divide-x
        border-divider
        divide-dashed divide-divider
      "
      :class="{ 'border-t': index == 0 }"
    >
      <input
        class="
          px-4
          py-3
          text-xs
          flex flex-1
          font-semibold
          bg-primaryLight
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
      <input
        class="
          px-4
          py-3
          text-xs
          flex flex-1
          font-semibold
          bg-primaryLight
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
          @click.native="deleteParam(index)"
        />
      </div>
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

export default {
  data() {
    return {
      params$: [],
    }
  },
  subscriptions() {
    return {
      params$: restParams$,
    }
  },
  // watch: {
  //   params$: {
  //     handler(newValue) {
  //       if (
  //         newValue[newValue.length - 1]?.key !== "" ||
  //         newValue[newValue.length - 1]?.value !== ""
  //       )
  //         this.addParam()
  //     },
  //     deep: true,
  //   },
  // },
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
