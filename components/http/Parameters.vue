<template>
  <AppSection class="pink" label="Parameters" ref="parameters" no-legend>
    <ul v-if="params.length !== 0">
      <li>
        <div class="row-wrapper">
          <label for="paramList">{{ $t("parameter_list") }}</label>
          <div>
            <button
              class="icon"
              @click="clearContent('parameters', $event)"
              v-tooltip.bottom="$t('clear')"
            >
              <i class="material-icons">clear_all</i>
            </button>
          </div>
        </div>
      </li>
    </ul>
    <ul
      v-for="(param, index) in params"
      :key="index"
      class="border-b border-dashed divide-y md:divide-x border-brdColor divide-dashed divide-brdColor md:divide-y-0"
      :class="{ 'border-t': index == 0 }"
    >
      <li>
        <input
          :placeholder="$t('parameter_count', { count: index + 1 })"
          :name="'param' + index"
          :value="param.key"
          @change="
            $store.commit('setKeyParams', {
              index,
              value: $event.target.value,
            })
          "
          autofocus
        />
      </li>
      <li>
        <input
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
          <button
            class="icon"
            @click="
              $store.commit('setActiveParams', {
                index,
                value: param.hasOwnProperty('active') ? !param.active : false,
              })
            "
            v-tooltip.bottom="{
              content: param.hasOwnProperty('active')
                ? param.active
                  ? $t('turn_off')
                  : $t('turn_on')
                : $t('turn_off'),
            }"
          >
            <i class="material-icons">
              {{
                param.hasOwnProperty("active")
                  ? param.active
                    ? "check_box"
                    : "check_box_outline_blank"
                  : "check_box"
              }}
            </i>
          </button>
        </li>
      </div>
      <div>
        <li>
          <button class="icon" @click="removeRequestParam(index)" v-tooltip.bottom="$t('delete')">
            <i class="material-icons">delete</i>
          </button>
        </li>
      </div>
    </ul>
    <ul>
      <li>
        <button class="icon" @click="addRequestParam">
          <i class="material-icons">add</i>
          <span>{{ $t("add_new") }}</span>
        </button>
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
