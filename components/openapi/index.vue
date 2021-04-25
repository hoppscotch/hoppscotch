<template>
  <AppSection icon="openapi" :label="$t('openapi')" ref="openapi" no-legend>
    <div class="show-on-large-screen">
      <input
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        v-model="filterText"
        class="rounded-t-lg"
      />
    </div>
    <div
      class="divide-y virtual-list divide-dashed divide-brdColor"
      :class="{ filled: filteredOpenAPI.length }"
    >
      <ul v-for="(entry, index) in filteredOpenAPI" :key="`entry-${index}`">
        <OpenapiCard
          v-if="page == 'rest'"
          :entry="entry"
          :id="index"
          :showMore="showMore"
          @use-entry="useHistory(entry)"
        />
      </ul>
    </div>
    <p :class="{ hidden: filteredOpenAPI.length != 0 }" class="info">
      {{ $t("nothing_found") }} "{{ filterText }}"
    </p>
    <p v-if="filteredOpenAPI.length === 0" class="info">
      <i class="material-icons">schedule</i> {{ $t("no_openapi") }}
    </p>
  </AppSection>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
  [readonly] {
    cursor: default;
  }
}
ul,
ol {
  flex-direction: column;
}
@media (max-width: 720px) {
  .virtual-list.filled {
    min-height: 320px;
  }
  .labels {
    display: none;
  }
}
</style>

<script>
export default {
  props: {
    page: String,
  },
  data() {
    return {
      openapi: JSON.parse(window.localStorage.getItem("openapi")) || [],
      filterText: "",
      showFilter: false,
      showMore: false,
    }
  },
  computed: {
    filteredOpenAPI() {
      const openapispec = this.$data.openapi

      var requestArr = []
      for (var pathName in openapispec.paths) {
        var path = openapispec.paths[pathName]
        for (var method in path) {
          for (var status in path[method].responses) {
            if (status !== "default") {
              requestArr.push({
                method: method.toUpperCase(),
                name: path[method].operationId,
                path: pathName,
                status,
                url: openapispec.host,
                headers: [],
                params: [],
                bodyParams: [],
                auth: "None",
                uri: "",
                httpUser: "",
                httpPassword: "",
                bearerToken: "",
                rawParams: "",
                rawInput: false,
                requestType: "",
                contentType: "",
              })
            }
          }
        }
      }

      return requestArr.filter((entry) => {
        const filterText = this.$data.filterText.toLowerCase()
        return Object.keys(entry).some((key) => {
          let value = entry[key]
          value = typeof value !== "string" ? value.toString() : value
          return value.toLowerCase().includes(filterText)
        })
      })
    },
  },
  methods: {
    useHistory(entry) {
      this.$emit("useHistory", entry)
    },
    toggleCollapse() {
      this.showMore = !this.showMore
    },
  },
}
</script>
