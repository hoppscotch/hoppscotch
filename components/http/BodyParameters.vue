<template>
  <div>
    <ul>
      <li>
        <div class="row-wrapper">
          <label for="reqParamList">{{ $t("request_body") }}</label>
          <div>
            <button
              v-tooltip.bottom="$t('clear')"
              class="icon"
              @click="clearContent('bodyParams', $event)"
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
      class="
        border-b border-dashed
        divide-y
        md:divide-x
        border-brdColor
        divide-dashed divide-brdColor
        md:divide-y-0
      "
      :class="{ 'border-t': index == 0 }"
    >
      <li>
        <input
          :placeholder="`key ${index + 1}`"
          :name="`bparam ${index}`"
          :value="param.key"
          autofocus
          @change="updateBodyParams($event, index, `setKeyBodyParams`)"
          @keyup.prevent="setRouteQueryState"
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
            updateBodyParams($event, index, `setValueBodyParams`)
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
            v-tooltip.bottom="{
              content: param.hasOwnProperty('active')
                ? param.active
                  ? $t('turn_off')
                  : $t('turn_on')
                : $t('turn_off'),
            }"
            class="icon"
            @click="toggleActive(index, param)"
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
            <button
              class="w-full icon"
              @click="$refs.attachment[index].click()"
            >
              <i class="material-icons">attach_file</i>
            </button>
          </label>
          <input
            ref="attachment"
            name="attachment"
            type="file"
            multiple
            @change="setRequestAttachment($event, index)"
          />
        </li>
      </div>
      <div>
        <li>
          <button
            v-tooltip.bottom="$t('delete')"
            class="icon"
            @click="removeRequestBodyParam(index)"
          >
            <i class="material-icons">delete</i>
          </button>
        </li>
      </div>
    </ul>
    <ul>
      <li>
        <button class="icon" name="addrequest" @click="addRequestBodyParam">
          <i class="material-icons">add</i>
          <span>{{ $t("add_new") }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    bodyParams: { type: Array, default: () => [] },
  },
  computed: {
    contentType() {
      return this.$store.state.request.contentType
    },
  },
  methods: {
    clearContent(bodyParams, $event) {
      this.$emit("clear-content", bodyParams, $event)
    },
    setRouteQueryState() {
      this.$emit("set-route-query-state")
    },
    removeRequestBodyParam(index) {
      const paramArr = this.$store.state.request.bodyParams.filter(
        (item, itemIndex) =>
          itemIndex !== index &&
          (Object.prototype.hasOwnProperty.call(item, "active")
            ? item.active === true
            : true)
      )
      this.setRawParams(paramArr)
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
    updateBodyParams(event, index, type) {
      this.$store.commit(type, {
        index,
        value: event.target.value,
      })
      const paramArr = this.$store.state.request.bodyParams.filter((item) =>
        Object.prototype.hasOwnProperty.call(item, "active")
          ? item.active === true
          : true
      )

      this.setRawParams(paramArr)
    },
    toggleActive(index, param) {
      const paramArr = this.$store.state.request.bodyParams.filter(
        (item, itemIndex) => {
          if (index === itemIndex) {
            return !param.active
          } else {
            return Object.prototype.hasOwnProperty.call(item, "active")
              ? item.active === true
              : true
          }
        }
      )

      this.setRawParams(paramArr)

      this.$store.commit("setActiveBodyParams", {
        index,
        value: Object.prototype.hasOwnProperty.call(param, "active")
          ? !param.active
          : false,
      })
    },
    setRawParams(filteredParamArr) {
      let rawParams = {}
      filteredParamArr.forEach((_param) => {
        rawParams = {
          ...rawParams,
          [_param.key]: _param.value,
        }
      })
      const rawParamsStr = JSON.stringify(rawParams, null, 2)
      this.$store.commit("setState", {
        value: rawParamsStr,
        attribute: "rawParams",
      })
    },
  },
}
</script>

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
