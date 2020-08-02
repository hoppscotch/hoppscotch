<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <pw-section class="blue" :label="$t('import')" ref="import">
          <ul>
            <li>
              <p class="info">
                {{ $t("generate_docs_message") }}
              </p>
            </li>
          </ul>
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="collectionUpload">
                  <button
                    class="icon"
                    @click="$refs.collectionUpload.click()"
                    v-tooltip="$t('json')"
                  >
                    <i class="material-icons">folder</i>
                    <span>{{ $t("import_collections") }}</span>
                  </button>
                </label>
                <input
                  ref="collectionUpload"
                  name="collectionUpload"
                  type="file"
                  @change="uploadCollection"
                />
                <div>
                  <button
                    class="icon"
                    @click="collectionJSON = '[]'"
                    v-tooltip.bottom="$t('clear')"
                  >
                    <i class="material-icons">clear_all</i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
          <ul>
            <li>
              <Editor
                v-model="collectionJSON"
                :lang="'json'"
                :lint="false"
                :options="{
                  maxLines: '16',
                  minLines: '8',
                  fontSize: '16px',
                  autoScrollEditorIntoView: true,
                  showPrintMargin: false,
                  useWorker: false,
                }"
              />
            </li>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="getDoc">
                <i class="material-icons">topic</i>
                <span>{{ $t("generate_docs") }}</span>
              </button>
            </li>
          </ul>
        </pw-section>

        <pw-section class="green" label="Documentation" ref="documentation">
          <p v-if="this.items.length === 0" class="info">
            {{ $t("generate_docs_first") }}
          </p>
          <div>
            <span class="collection" v-for="(collection, index) in this.items" :key="index">
              <h2>
                <i class="material-icons">folder</i>
                {{ collection.name || $t("none") }}
              </h2>
              <span class="folder" v-for="(folder, index) in collection.folders" :key="index">
                <h3>
                  <i class="material-icons">folder_open</i>
                  {{ folder.name || $t("none") }}
                </h3>
                <span class="request" v-for="(request, index) in folder.requests" :key="index">
                  <h4>
                    <i class="material-icons">insert_drive_file</i>
                    {{ request.name || $t("none") }}
                  </h4>
                  <p class="doc-desc" v-if="request.url">
                    <span>
                      {{ $t("url") }}: <code>{{ request.url || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.path">
                    <span>
                      {{ $t("path") }}:
                      <code>{{ request.path || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.method">
                    <span>
                      {{ $t("method") }}:
                      <code>{{ request.method || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.auth">
                    <span>
                      {{ $t("authentication") }}:
                      <code>{{ request.auth || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.httpUser">
                    <span>
                      {{ $t("username") }}:
                      <code>{{ request.httpUser || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.httpPassword">
                    <span>
                      {{ $t("password") }}:
                      <code>{{ request.httpPassword || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.bearerToken">
                    <span>
                      {{ $t("token") }}:
                      <code>{{ request.bearerToken || $t("none") }}</code>
                    </span>
                  </p>
                  <h4 v-if="request.headers.length > 0">{{ $t("headers") }}</h4>
                  <span v-if="request.headers">
                    <p v-for="header in request.headers" :key="header.key" class="doc-desc">
                      <span>
                        {{ header.key || $t("none") }}:
                        <code>{{ header.value || $t("none") }}</code>
                      </span>
                    </p>
                  </span>
                  <h4 v-if="request.params.length > 0">{{ $t("parameters") }}</h4>
                  <span v-if="request.params">
                    <p v-for="parameter in request.params" :key="parameter.key" class="doc-desc">
                      <span>
                        {{ parameter.key || $t("none") }}:
                        <code>{{ parameter.value || $t("none") }}</code>
                      </span>
                    </p>
                  </span>
                  <h4 v-if="request.bodyParam">{{ $t("payload") }}</h4>
                  <span v-if="request.bodyParam">
                    <p v-for="payload in request.bodyParam" :key="payload.key" class="doc-desc">
                      <span>
                        {{ payload.key || $t("none") }}:
                        <code>{{ payload.value || $t("none") }}</code>
                      </span>
                    </p>
                  </span>
                  <p class="doc-desc" v-if="request.rawParams">
                    <span>
                      {{ $t("parameters") }}:
                      <code>{{ request.rawParams || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.contentType">
                    <span>
                      {{ $t("content_type") }}:
                      <code>{{ request.contentType || $t("none") }}</code>
                    </span>
                  </p>
                  <p class="doc-desc" v-if="request.requestType">
                    <span>
                      {{ $t("request_type") }}:
                      <code>{{ request.requestType || $t("none") }}</code>
                    </span>
                  </p>
                </span>
              </span>
              <span
                class="request"
                v-for="(request, index) in collection.requests"
                :key="`request-${index}`"
              >
                <h4>
                  <i class="material-icons">insert_drive_file</i>
                  {{ request.name || $t("none") }}
                </h4>
                <p class="doc-desc" v-if="request.url">
                  <span>
                    {{ $t("url") }}: <code>{{ request.url || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.path">
                  <span>
                    {{ $t("path") }}: <code>{{ request.path || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.method">
                  <span>
                    {{ $t("method") }}:
                    <code>{{ request.method || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.auth">
                  <span>
                    {{ $t("authentication") }}:
                    <code>{{ request.auth || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.httpUser">
                  <span>
                    {{ $t("username") }}:
                    <code>{{ request.httpUser || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.httpPassword">
                  <span>
                    {{ $t("password") }}:
                    <code>{{ request.httpPassword || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.bearerToken">
                  <span>
                    {{ $t("token") }}:
                    <code>{{ request.bearerToken || $t("none") }}</code>
                  </span>
                </p>
                <h4 v-if="request.headers.length > 0">{{ $t("headers") }}</h4>
                <span v-if="request.headers">
                  <p v-for="header in request.headers" :key="header.key" class="doc-desc">
                    <span>
                      {{ header.key || $t("none") }}:
                      <code>{{ header.value || $t("none") }}</code>
                    </span>
                  </p>
                </span>
                <h4 v-if="request.params.length > 0">{{ $t("parameters") }}</h4>
                <span v-if="request.params">
                  <p v-for="parameter in request.params" :key="parameter.key" class="doc-desc">
                    <span>
                      {{ parameter.key || $t("none") }}:
                      <code>{{ parameter.value || $t("none") }}</code>
                    </span>
                  </p>
                </span>
                <h4 v-if="request.bodyParam">{{ $t("payload") }}</h4>
                <span v-if="request.bodyParam">
                  <p v-for="payload in request.bodyParam" :key="payload.key" class="doc-desc">
                    <span>
                      {{ payload.key || $t("none") }}:
                      <code>{{ payload.value || $t("none") }}</code>
                    </span>
                  </p>
                </span>
                <p class="doc-desc" v-if="request.rawParams">
                  <span>
                    {{ $t("parameters") }}:
                    <code>{{ request.rawParams || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.contentType">
                  <span>
                    {{ $t("content_type") }}:
                    <code>{{ request.contentType || $t("none") }}</code>
                  </span>
                </p>
                <p class="doc-desc" v-if="request.requestType">
                  <span>
                    {{ $t("request_type") }}:
                    <code>{{ request.requestType || $t("none") }}</code>
                  </span>
                </p>
              </span>
            </span>
          </div>
        </pw-section>
      </div>

      <aside class="sticky-inner inner-right">
        <collections @use-collection="useSelectedCollection($event)" :doc="true" />
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.collection,
.doc-desc,
.folder,
.request {
  display: flex;
  flex-flow: column;
  justify-content: center;
  flex: 1;
  padding: 16px;

  .material-icons {
    margin-right: 16px;
  }
}

.folder {
  border-left: 1px solid var(--brd-color);
  margin: 16px 0 0;
}

.request {
  border: 1px solid var(--brd-color);
  border-radius: 8px;
  margin: 16px 0 0;

  h4 {
    margin: 8px 0;
  }
}

.doc-desc {
  color: var(--fg-light-color);
  border-bottom: 1px dashed var(--brd-color);
  margin: 0;

  &:last-child {
    border-bottom: none;
  }
}
</style>

<script>
import AceEditor from "~/components/ui/ace-editor"

export default {
  components: {
    "pw-section": () => import("~/components/layout/section"),
    Editor: AceEditor,
    collections: () => import("~/components/collections"),
  },
  data() {
    return {
      collectionJSON: "[]",
      items: [],
    }
  },
  methods: {
    uploadCollection() {
      this.rawInput = true
      let file = this.$refs.collectionUpload.files[0]
      if (file !== undefined && file !== null) {
        let reader = new FileReader()
        reader.onload = ({ target }) => {
          this.collectionJSON = target.result
        }
        reader.readAsText(file)
        this.$toast.info(this.$t("file_imported"), {
          icon: "attach_file",
        })
      } else {
        this.$toast.error(this.$t("choose_file"), {
          icon: "attach_file",
        })
      }
    },

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON)
        this.$toast.clear()
        this.$toast.info(this.$t("docs_generated"), {
          icon: "book",
        })
      } catch (e) {
        this.$toast.error(e, {
          icon: "code",
        })
      }
    },

    useSelectedCollection(collection) {
      let importCollection = `[${JSON.stringify(collection, null, 2)}]`
      this.collectionJSON = JSON.stringify(JSON.parse(importCollection), null, 2)
    },
  },
  head() {
    return {
      title: `Documentation • ${this.$store.state.name}`,
    }
  },
}
</script>
