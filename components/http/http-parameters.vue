<template>
  <pw-section class="pink" label="Parameters" ref="parameters" no-legend>
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
    <ul v-for="(param, index) in params" :key="index">
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
          :value="decodeURI(param.value)"
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
            @click="removeRequestParam(index)"
            v-tooltip.bottom="$t('delete')"
            id="param"
          >
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
  </pw-section>
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
