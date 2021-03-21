<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <AppSection :label="$t('import')" ref="import" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("collection") }}</label>
            <p class="info">
              {{ $t("generate_docs_message") }}
            </p>
            <div class="row-wrapper">
              <label for="collectionUpload">
                <button class="icon" @click="$refs.collectionUpload.click()" v-tooltip="'JSON'">
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
                <button class="icon" @click="collectionJSON = '[]'" v-tooltip.bottom="$t('clear')">
                  <i class="material-icons">clear_all</i>
                </button>
              </div>
            </div>
            <SmartAceEditor
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
            <button class="icon" @click="getDoc">
              <i class="material-icons">topic</i>
              <span>{{ $t("generate_docs") }}</span>
            </button>
          </div>
        </AppSection>

        <AppSection :label="$t('documentation')" ref="documentation" no-legend>
          <div class="flex flex-col">
            <label>{{ $t("documentation") }}</label>
            <p v-if="this.items.length === 0" class="info">
              {{ $t("generate_docs_first") }}
            </p>
            <div v-else class="row-wrapper">
              <div
                v-tooltip.bottom="{
                  content: !fb.currentUser
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : fb.currentUser.provider !== 'github.com'
                    ? $t('login_with_github_to') + $t('create_secret_gist')
                    : null,
                }"
              >
                <button
                  :disabled="
                    !fb.currentUser ? true : fb.currentUser.provider !== 'github.com' ? true : false
                  "
                  class="icon"
                  @click="createDocsGist"
                >
                  <i class="material-icons">assignment</i>
                  <span>{{ $t("create_secret_gist") }}</span>
                </button>
              </div>
            </div>
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
                    <h4 v-if="request.bodyParams">{{ $t("payload") }}</h4>
                    <span v-if="request.bodyParams">
                      <p v-for="payload in request.bodyParams" :key="payload.key" class="doc-desc">
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
                  <h4 v-if="request.bodyParams">{{ $t("payload") }}</h4>
                  <span v-if="request.bodyParams">
                    <p v-for="payload in request.bodyParams" :key="payload.key" class="doc-desc">
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
          </div>
        </AppSection>
      </div>

      <aside class="sticky-inner inner-right lg:max-w-md">
        <Collections @use-collection="useSelectedCollection($event)" :doc="true" />
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.collection,
.doc-desc,
.folder,
.request {
  @apply flex;
  @apply flex-col;
  @apply justify-center;
  @apply flex-1;
  @apply p-4;

  .material-icons {
    @apply mr-4;
  }
}

.folder {
  @apply border-l;
  @apply border-brdColor;
  @apply mt-4;
}

.request {
  @apply border;
  @apply border-brdColor;
  @apply rounded-lg;
  @apply mt-4;

  h4 {
    @apply mt-4;
  }
}

.doc-desc {
  @apply text-fgLightColor;
  @apply border-b;
  @apply border-dashed;
  @apply border-brdColor;
  @apply m-0;

  &:last-child {
    @apply border-b-0;
  }
}
</style>

<script>
import { fb } from "~/helpers/fb"
import Mustache from "mustache"
import DocsTemplate from "~/assets/md/docs.md"

export default {
  data() {
    return {
      fb,
      collectionJSON: "[]",
      items: [],
      docsMarkdown: "",
    }
  },
  methods: {
    async createDocsGist() {
      await this.$axios
        .$post(
          "https://api.github.com/gists",
          {
            files: {
              "api-docs.md": {
                content: this.docsMarkdown,
              },
            },
          },
          {
            headers: {
              Authorization: `token ${fb.currentUser.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )
        .then(({ html_url }) => {
          this.$toast.success(this.$t("gist_created"), {
            icon: "done",
          })
          window.open(html_url)
        })
        .catch((error) => {
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
          console.log(error)
        })
    },

    uploadCollection() {
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
      this.$refs.collectionUpload.value = ""
    },

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON)
        this.$toast.clear()
        this.$toast.info(this.$t("docs_generated"), {
          icon: "book",
        })
        const docsMarkdown = Mustache.render(DocsTemplate, {
          collections: this.items,
          isHeaders() {
            return this.headers.length
          },
          isParams() {
            return this.params.length
          },
          isAuth() {
            return this.auth !== "None"
          },
          isAuthBasic() {
            return this.httpUser && this.httpPassword
          },
          isRawParams() {
            return this.rawParams && this.rawParams !== "{}"
          },
        })
        this.docsMarkdown = docsMarkdown.replace(/^\s*[\r\n]/gm, "\n")
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
      title: `Documentation • Hoppscotch`,
    }
  },
}
</script>
