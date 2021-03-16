<template>
  <div>
    <ul>
      <li>
        <div class="row-wrapper">
          <label for="reqParamList">{{ $t("request_body") }}</label>
          <div>
            <button
              class="icon"
              @click="clearContent('bodyParams', $event)"
              v-tooltip.bottom="$t('clear')"
            >
              <i class="material-icons">clear_all</i>
            </button>
          </div>
        </div>
      </li>
    </ul>
    <ul
      v-for="(param, index) in bodyParams"
      :key="index"
      class="border-b border-dashed divide-y md:divide-x border-brdColor divide-dashed divide-brdColor md:divide-y-0"
      :class="{ 'border-t': index == 0 }"
    >
      <li>
        <input
          :placeholder="`key ${index + 1}`"
          :name="`bparam ${index}`"
          :value="param.key"
          @change="
            $store.commit('setKeyBodyParams', {
              index,
              value: $event.target.value,
            })
          "
          @keyup.prevent="setRouteQueryState"
          autofocus
        />
      </li>
      <li>
        <input
          v-if="!requestBodyParamIsFile(index)"
          :placeholder="`value ${index + 1}`"
          :value="param.value"
          @change="
            // if input is form data, set value to be an array containing the value
            // only
            $store.commit('setValueBodyParams', {
              index,
              value: $event.target.value,
            })
          "
          @keyup.prevent="setRouteQueryState"
        />
        <div v-else class="file-chips-container">
          <div class="file-chips-wrapper">
            <SmartDeletableChip
              v-for="(file, i) in Array.from(bodyParams[index].value)"
              :key="`body-param-${index}-file-${i}`"
              @chip-delete="chipDelete(index, i)"
            >
              {{ file.name }}
            </SmartDeletableChip>
          </div>
        </div>
      </li>
      <div>
        <li>
          <button
            class="icon"
            @click="
              $store.commit('setActiveBodyParams', {
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
      <div v-if="contentType === 'multipart/form-data'">
        <li>
          <label for="attachment" class="p-0">
            <button class="w-full icon" @click="$refs.attachment[index].click()">
              <i class="material-icons">attach_file</i>
            </button>
          </label>
          <input
            ref="attachment"
            name="attachment"
            type="file"
            @change="setRequestAttachment($event, index)"
            multiple
          />
        </li>
      </div>
      <div>
        <li>
          <button
            class="icon"
            @click="removeRequestBodyParam(index)"
            v-tooltip.bottom="$t('delete')"
          >
            <i class="material-icons">delete</i>
          </button>
        </li>
      </div>
    </ul>
    <ul>
      <li>
        <button class="icon" @click="addRequestBodyParam" name="addrequest">
          <i class="material-icons">add</i>
          <span>{{ $t("add_new") }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.file-chips-container {
  @apply flex;
  @apply flex-1;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply bg-bgDarkColor;

  .file-chips-wrapper {
    @apply flex;
    @apply w-0;
  }
}
</style>

<script>
export default {
  props: {
    bodyParams: { type: Array, default: () => [] },
  },
  methods: {
    clearContent(bodyParams, $event) {
      this.$emit("clear-content", bodyParams, $event)
    },
    setRouteQueryState() {
      this.$emit("set-route-query-state")
    },
    removeRequestBodyParam(index) {
      this.$emit("remove-request-body-param", index)
    },
    addRequestBodyParam() {
      this.$emit("add-request-body-param")
    },
    setRequestAttachment(event, index) {
      const { files } = event.target
      this.$store.commit("setFilesBodyParams", {
        index,
        value: Array.from(files),
      })
    },
    requestBodyParamIsFile(index) {
      const bodyParamValue = this.bodyParams?.[index]?.value
      const isFile = bodyParamValue?.[0] instanceof File
      return isFile
    },
    chipDelete(paramIndex, fileIndex) {
      this.$store.commit("removeFile", {
        index: paramIndex,
        fileIndex,
      })
    },
  },
  computed: {
    contentType() {
      return this.$store.state.request.contentType
    },
  },
}
</script>
