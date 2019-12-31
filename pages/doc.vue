<template>
  <div class="page">
    <pw-section class="blue" label="Collections" ref="collections">
      <ul>
        <li>
          <p class="info">
            Import any Postwoman Collection to Generate Documentation on-the-go.
          </p>
        </li>
      </ul>
      <ul>
        <li>
          <label for="collectionUpload">
            <button
              class="icon"
              @click="$refs.collectionUpload.click()"
              v-tooltip="'JSON'"
            >
              <i class="material-icons">folder</i>
              <span>Import collections</span>
            </button>
          </label>
          <input
            ref="collectionUpload"
            name="collectionUpload"
            type="file"
            @change="uploadCollection"
          />
        </li>
      </ul>
      <ul>
        <li>
          <Editor
            v-model="collectionJSON"
            :lang="'json'"
            :options="{
              maxLines: '16',
              minLines: '8',
              fontSize: '16px',
              autoScrollEditorIntoView: true,
              showPrintMargin: false,
              useWorker: false
            }"
          />
        </li>
      </ul>
      <ul>
        <li>
          <button class="icon" @click="getDoc">
            <i class="material-icons">book</i>
            <span>Generate Documentation</span>
          </button>
        </li>
      </ul>
    </pw-section>

    <pw-section class="green" label="Documentation" ref="documentation">
      <p v-if="this.items.length === 0" class="info">
        Generate documentation first
      </p>
      <div>
        <span
          class="collection"
          v-for="(collection, index) in this.items"
          :key="index"
        >
          <h2>
            <i class="material-icons">folder</i>
            {{ collection.name || "None" }}
          </h2>
          <span
            class="folder"
            v-for="(folder, index) in collection.folders"
            :key="index"
          >
            <h3>
              <i class="material-icons">folder_open</i>
              {{ folder.name || "None" }}
            </h3>
            <span
              class="request"
              v-for="(request, index) in folder.requests"
              :key="index"
            >
              <h4>
                <i class="material-icons">insert_drive_file</i>
                {{ request.name || "None" }}
              </h4>
              <p class="doc-desc" v-if="request.url">
                <span>
                  URL: <code>{{ request.url || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.path">
                <span>
                  Path: <code>{{ request.path || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.method">
                <span>
                  Method: <code>{{ request.method || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.auth">
                <span>
                  Authentication:
                  <code>{{ request.auth || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.httpUser">
                <span>
                  Username: <code>{{ request.httpUser || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.httpPassword">
                <span>
                  Password:
                  <code>{{ request.httpPassword || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.bearerToken">
                <span>
                  Token: <code>{{ request.bearerToken || "None" }}</code>
                </span>
              </p>
              <h4 v-if="request.headers.length > 0">Headers</h4>
              <span
                v-if="request.headers"
                v-for="header in request.headers"
                :key="header.key"
              >
                <p class="doc-desc">
                  <span>
                    {{ header.key || "None" }}:
                    <code>{{ header.value || "None" }}</code>
                  </span>
                </p>
              </span>
              <h4 v-if="request.params.length > 0">Parameters</h4>
              <span
                v-if="request.params"
                v-for="parameter in request.params"
                :key="parameter.key"
              >
                <p class="doc-desc">
                  <span>
                    {{ parameter.key || "None" }}:
                    <code>{{ parameter.value || "None" }}</code>
                  </span>
                </p>
              </span>
              <h4 v-if="request.bodyParam">Payload</h4>
              <span
                v-if="request.bodyParam"
                v-for="payload in request.bodyParam"
                :key="payload.key"
              >
                <p class="doc-desc">
                  <span>
                    {{ payload.key || "None" }}:
                    <code>{{ payload.value || "None" }}</code>
                  </span>
                </p>
              </span>
              <p class="doc-desc" v-if="request.rawParams">
                <span>
                  Parameters: <code>{{ request.rawParams || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.contentType">
                <span>
                  Content Type:
                  <code>{{ request.contentType || "None" }}</code>
                </span>
              </p>
              <p class="doc-desc" v-if="request.requestType">
                <span>
                  Request Type:
                  <code>{{ request.requestType || "None" }}</code>
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
              {{ request.name || "None" }}
            </h4>
            <p class="doc-desc" v-if="request.url">
              <span>
                URL: <code>{{ request.url || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.path">
              <span>
                Path: <code>{{ request.path || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.method">
              <span>
                Method: <code>{{ request.method || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.auth">
              <span>
                Authentication:
                <code>{{ request.auth || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.httpUser">
              <span>
                Username: <code>{{ request.httpUser || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.httpPassword">
              <span>
                Password: <code>{{ request.httpPassword || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.bearerToken">
              <span>
                Token: <code>{{ request.bearerToken || "None" }}</code>
              </span>
            </p>
            <h4 v-if="request.headers.length > 0">Headers</h4>
            <span
              v-if="request.headers"
              v-for="header in request.headers"
              :key="header.key"
            >
              <p class="doc-desc">
                <span>
                  {{ header.key || "None" }}:
                  <code>{{ header.value || "None" }}</code>
                </span>
              </p>
            </span>
            <h4 v-if="request.params.length > 0">Parameters</h4>
            <span
              v-if="request.params"
              v-for="parameter in request.params"
              :key="parameter.key"
            >
              <p class="doc-desc">
                <span>
                  {{ parameter.key || "None" }}:
                  <code>{{ parameter.value || "None" }}</code>
                </span>
              </p>
            </span>
            <h4 v-if="request.bodyParam">Payload</h4>
            <span
              v-if="request.bodyParam"
              v-for="payload in request.bodyParam"
              :key="payload.key"
            >
              <p class="doc-desc">
                <span>
                  {{ payload.key || "None" }}:
                  <code>{{ payload.value || "None" }}</code>
                </span>
              </p>
            </span>
            <p class="doc-desc" v-if="request.rawParams">
              <span>
                Parameters: <code>{{ request.rawParams || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.contentType">
              <span>
                Content Type:
                <code>{{ request.contentType || "None" }}</code>
              </span>
            </p>
            <p class="doc-desc" v-if="request.requestType">
              <span>
                Request Type:
                <code>{{ request.requestType || "None" }}</code>
              </span>
            </p>
          </span>
        </span>
      </div>
    </pw-section>
  </div>
</template>

<style scoped lang="scss">
.collection,
.folder,
.request,
.doc-desc {
  display: flex;
  flex-flow: column;
  justify-content: center;
  flex: 1;
  padding: 16px;

  .material-icons {
    margin-right: 16px;
  }
}

.collection {
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
import AceEditor from "../components/ace-editor";

export default {
  components: {
    "pw-section": () => import("../components/section"),
    Editor: AceEditor
  },

  data() {
    return {
      collectionJSON: "[]",
      items: []
    };
  },

  methods: {
    uploadCollection() {
      this.rawInput = true;
      let file = this.$refs.collectionUpload.files[0];
      if (file !== undefined && file !== null) {
        let reader = new FileReader();
        reader.onload = e => {
          this.collectionJSON = e.target.result;
        };
        reader.readAsText(file);
        this.$toast.info("File imported", {
          icon: "attach_file"
        });
      } else {
        this.$toast.error("Choose a file", {
          icon: "attach_file"
        });
      }
    },

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON);
        this.$toast.info("Documentation generated", {
          icon: "book"
        });
      } catch (e) {
        this.$toast.error(e, {
          icon: "code"
        });
      }
    }
  }
};
</script>
