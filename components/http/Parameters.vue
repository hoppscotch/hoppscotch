<template>
  <AppSection label="parameters">
    <div
      v-if="params.length !== 0"
      class="flex flex-1 items-center justify-between pl-4"
    >
      <label for="paramList" class="font-semibold text-xs">
        {{ $t("parameter_list") }}
      </label>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('clear_all')"
        icon="clear_all"
        @click.native="clearContent('parameters', $event)"
      />
    </div>
    <div
      v-for="(param, index) in params"
      :key="index"
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
          $store.commit('setKeyParams', {
            index,
            value: $event.target.value,
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
          $store.commit('setValueParams', {
            index,
            value: $event.target.value,
          })
        "
      />
      <div class="flex relative">
        <span class="select-wrapper">
          <select
            class="
              flex
              w-full
              px-4
              text-xs
              py-3
              mr-8
              focus:outline-none
              font-medium
              bg-primaryLight
            "
            :name="'type' + index"
            @change="
              $store.commit('setTypeParams', {
                index,
                value: $event.target.value,
              })
            "
          >
            <option value="query" :selected="param.type === 'query'">
              {{ $t("query") }}
            </option>
            <option value="path" :selected="param.type === 'path'">
              {{ $t("path") }}
            </option>
          </select>
        </span>
      </div>
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
            $store.commit('setActiveParams', {
              index,
              value: param.hasOwnProperty('active') ? !param.active : false,
            })
          "
        />
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('delete')"
          icon="delete"
          @click.native="removeRequestParam(index)"
        />
      </div>
    </div>
  </AppSection>
</template>

<script>
export default {
  props: {
    params: { type: Array, default: () => [] },
  },
  watch: {
    params: {
      handler(newValue) {
        if (
          newValue[newValue.length - 1]?.key !== "" ||
          newValue[newValue.length - 1]?.value !== ""
        )
          this.addRequestParam()
      },
      deep: true,
    },
  },
  mounted() {
    if (!this.params?.length) {
      this.addRequestParam()
    }
  },
  methods: {
    clearContent(parameters, $event) {
      this.$emit("clear-content", parameters, $event)
    },
    removeRequestParam(index) {
      this.$emit("remove-request-param", index)
    },
    addRequestParam() {
      this.$emit("add-request-param")
    },
  },
}
</script>
