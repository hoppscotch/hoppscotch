<template>
  <AppSection label="parameters">
    <ul v-if="params.length !== 0">
      <li>
        <div class="row-wrapper">
          <label for="paramList">{{ $t("parameter_list") }}</label>
          <div>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('clear')"
              icon="clear_all"
              @click.native="clearContent('parameters', $event)"
            />
          </div>
        </div>
      </li>
    </ul>
    <ul
      v-for="(param, index) in params"
      :key="index"
      class="
        border-b border-dashed
        divide-y
        md:divide-x
        border-divider
        divide-dashed divide-divider
        md:divide-y-0
      "
      :class="{ 'border-t': index == 0 }"
    >
      <li>
        <input
          class="input"
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
      </li>
      <li>
        <input
          class="input"
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
      </li>
      <li>
        <span class="select-wrapper">
          <select
            class="select"
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
      </li>
      <div>
        <li>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            title="{
              content: param.hasOwnProperty('active')
                ? param.active
                  ? $t('turn_off')
                  : $t('turn_on')
                : $t('turn_off'),
            }"
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
        </li>
      </div>
      <div>
        <li>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('delete')"
            icon="delete"
            @click.native="removeRequestParam(index)"
          />
        </li>
      </div>
    </ul>
    <ul>
      <li>
        <ButtonSecondary
          icon="add"
          :label="$t('add_new')"
          @click.native="addRequestParam"
        />
      </li>
    </ul>
  </AppSection>
</template>

<script>
export default {
  props: {
    params: { type: Array, default: () => [] },
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
