<template>
  <div class="page">
    <div class="content">
      <div class="page-columns inner-left">
        <pw-section
          v-if="showPreRequestScript"
          class="orange"
          label="Pre-Request"
          ref="preRequest"
        >
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="generatedCode">{{ $t("javascript_code") }}</label>
                <div>
                  <a
                    href="https://github.com/liyasthomas/postwoman/wiki/Pre-Request-Scripts"
                    target="_blank"
                    rel="noopener"
                  >
                    <button class="icon" v-tooltip="'Wiki'">
                      <i class="material-icons">help</i>
                    </button>
                  </a>
                </div>
              </div>
              <Editor
                v-model="preRequestScript"
                :lang="'javascript'"
                :options="{
                  maxLines: responseBodyMaxLines,
                  minLines: '16',
                  fontSize: '16px',
                  autoScrollEditorIntoView: true,
                  showPrintMargin: false,
                  useWorker: false
                }"
              />
            </li>
          </ul>
        </pw-section>

        <pw-section class="blue" label="Request" ref="request">
          <ul>
            <li>
              <label for="method">{{ $t("method") }}</label>
              <select id="method" v-model="method" @change="methodChange">
                <option>GET</option>
                <option>HEAD</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
                <option>OPTIONS</option>
                <option>PATCH</option>
              </select>
            </li>
            <li>
              <label for="url">{{ $t("url") }}</label>
              <input
                :class="{ error: !isValidURL }"
                @keyup.enter="isValidURL ? sendRequest() : null"
                id="url"
                name="url"
                type="url"
                v-model="url"
              />
            </li>
            <li>
              <label for="path">{{ $t("path") }}</label>
              <input
                @keyup.enter="isValidURL ? sendRequest() : null"
                id="path"
                name="path"
                v-model="path"
                @input="pathInputHandler"
              />
            </li>
            <li>
              <label for="label">{{ $t("label") }}</label>
              <input
                id="label"
                name="label"
                type="text"
                v-model="label"
                placeholder="(optional)"
                list="preLabels"
              />
              <datalist id="preLabels">
                <option value="Login"></option>
                <option value="Logout"></option>
                <option value="Bug"></option>
                <option value="Users"></option>
              </datalist>
            </li>
            <ul>
              <li>
                <label class="hide-on-small-screen" for="send">&nbsp;</label>
                <button
                  :disabled="!isValidURL"
                  @click="sendRequest"
                  id="send"
                  ref="sendButton"
                >
                  {{ $t("send") }}
                  <span id="hidden-message">{{ $t("again") }}</span>
                  <span>
                    <i class="material-icons">send</i>
                  </span>
                </button>
              </li>
            </ul>
          </ul>
          <div
            class="blue"
            label="Request Body"
            v-if="['POST', 'PUT', 'PATCH'].includes(method)"
          >
            <ul>
              <li>
                <label for="contentType">{{ $t("content_type") }}</label>
                <autocomplete
                  :source="validContentTypes"
                  :spellcheck="false"
                  v-model="contentType"
                  >Content Type</autocomplete
                >
              </li>
            </ul>
            <ul>
              <li>
                <div class="flex-wrap">
                  <span>
                    <pw-toggle :on="rawInput" @change="rawInput = $event">
                      {{ $t("raw_input") }}
                      {{ rawInput ? $t("enabled") : $t("disabled") }}
                    </pw-toggle>
                  </span>
                  <div>
                    <label for="payload">
                      <button
                        class="icon"
                        @click="$refs.payload.click()"
                        v-tooltip="'Upload file'"
                      >
                        <i class="material-icons">attach_file</i>
                      </button>
                    </label>
                    <input
                      ref="payload"
                      name="payload"
                      type="file"
                      @change="uploadPayload"
                    />
                  </div>
                </div>
              </li>
            </ul>
            <div v-if="!rawInput">
              <ul>
                <li>
                  <label for="reqParamList">{{ $t("parameter_list") }}</label>
                  <textarea
                    id="reqParamList"
                    readonly
                    v-textarea-auto-height="rawRequestBody"
                    v-model="rawRequestBody"
                    placeholder="(add at least one parameter)"
                    rows="1"
                  ></textarea>
                </li>
              </ul>
              <ul v-for="(param, index) in bodyParams" :key="index">
                <li>
                  <input
                    :placeholder="'key ' + (index + 1)"
                    :name="'bparam' + index"
                    :value="param.key"
                    @change="
                      $store.commit('setKeyBodyParams', {
                        index,
                        value: $event.target.value
                      })
                    "
                    @keyup.prevent="setRouteQueryState"
                    autofocus
                  />
                </li>
                <li>
                  <input
                    :placeholder="'value ' + (index + 1)"
                    :id="'bvalue' + index"
                    :name="'bvalue' + index"
                    :value="param.value"
                    @change="
                      $store.commit('setValueBodyParams', {
                        index,
                        value: $event.target.value
                      })
                    "
                    @keyup.prevent="setRouteQueryState"
                  />
                </li>
                <div>
                  <li>
                    <button
                      class="icon"
                      @click="removeRequestBodyParam(index)"
                      id="delParam"
                    >
                      <i class="material-icons">delete</i>
                    </button>
                  </li>
                </div>
              </ul>
              <ul>
                <li>
                  <button
                    class="icon"
                    @click="addRequestBodyParam"
                    name="addrequest"
                  >
                    <i class="material-icons">add</i>
                    <span>{{ $t("add_new") }}</span>
                  </button>
                </li>
              </ul>
            </div>
            <div v-else>
              <ul>
                <li>
                  <label for="rawBody">{{ $t("raw_request_body") }}</label>
                  <textarea
                    id="rawBody"
                    @keydown="formatRawParams"
                    rows="8"
                    v-model="rawParams"
                  ></textarea>
                </li>
              </ul>
            </div>
          </div>
          <div class="flex-wrap">
            <div style="text-align: center;">
              <button
                class="icon"
                id="show-modal"
                @click="showModal = true"
                v-tooltip.bottom="'Import cURL'"
              >
                <i class="material-icons">import_export</i>
              </button>
              <button
                class="icon"
                id="code"
                @click="isHidden = !isHidden"
                :disabled="!isValidURL"
                v-tooltip.bottom="{
                  content: isHidden ? $t('show_code') : $t('hide_code')
                }"
              >
                <i class="material-icons">flash_on</i>
              </button>
              <button
                :class="'icon' + (showPreRequestScript ? ' info-response' : '')"
                id="preRequestScriptButton"
                v-tooltip.bottom="{
                  content: !showPreRequestScript
                    ? $t('show_prerequest_script')
                    : $t('hide_prerequest_script')
                }"
                @click="showPreRequestScript = !showPreRequestScript"
              >
                <i
                  class="material-icons"
                  :class="showPreRequestScript"
                  v-if="!showPreRequestScript"
                  >code</i
                >
                <i class="material-icons" :class="showPreRequestScript" v-else
                  >close</i
                >
              </button>
            </div>
            <div style="text-align: center;">
              <button
                class="icon"
                @click="copyRequest"
                id="copyRequest"
                ref="copyRequest"
                :disabled="!isValidURL"
                v-tooltip.bottom="'Copy Request URL'"
              >
                <i class="material-icons">file_copy</i>
              </button>

              <button
                class="icon"
                @click="saveRequest"
                id="saveRequest"
                ref="saveRequest"
                :disabled="!isValidURL"
                v-tooltip.bottom="'Save to Collections'"
              >
                <i class="material-icons">save</i>
              </button>
              <button
                class="icon"
                @click="clearContent('', $event)"
                v-tooltip.bottom="'Clear All'"
                ref="clearAll"
              >
                <i class="material-icons">clear_all</i>
              </button>
            </div>
          </div>
        </pw-section>

        <section id="options">
          <input id="tab-one" type="radio" name="options" checked="checked" />
          <label for="tab-one">{{ $t("authentication") }}</label>
          <div class="tab">
            <pw-section
              class="cyan"
              label="Authentication"
              ref="authentication"
            >
              <ul>
                <li>
                  <div class="flex-wrap">
                    <label for="auth">{{ $t("authentication") }}</label>
                    <div>
                      <button
                        class="icon"
                        @click="clearContent('auth', $event)"
                        v-tooltip.bottom="'Clear'"
                      >
                        <i class="material-icons">clear_all</i>
                      </button>
                    </div>
                  </div>
                  <select id="auth" v-model="auth">
                    <option>None</option>
                    <option>Basic</option>
                    <option>Bearer Token</option>
                  </select>
                </li>
              </ul>
              <ul v-if="auth === 'Basic'">
                <li>
                  <input
                    placeholder="User"
                    name="http_basic_user"
                    v-model="httpUser"
                  />
                </li>
                <li>
                  <input
                    placeholder="Password"
                    name="http_basic_passwd"
                    :type="passwordFieldType"
                    v-model="httpPassword"
                  />
                </li>
                <div>
                  <li>
                    <button
                      class="icon"
                      id="switchVisibility"
                      ref="switchVisibility"
                      @click="switchVisibility"
                    >
                      <i
                        class="material-icons"
                        v-if="passwordFieldType === 'text'"
                        >visibility</i
                      >
                      <i
                        class="material-icons"
                        v-if="passwordFieldType !== 'text'"
                        >visibility_off</i
                      >
                    </button>
                  </li>
                </div>
              </ul>
              <ul v-else-if="auth === 'Bearer Token'">
                <li>
                  <input
                    placeholder="Token"
                    name="bearer_token"
                    v-model="bearerToken"
                  />
                </li>
              </ul>
              <div class="flex-wrap">
                <pw-toggle
                  :on="!urlExcludes.auth"
                  @change="setExclude('auth', !$event)"
                >
                  {{ $t("include_in_url") }}
                </pw-toggle>
              </div>
            </pw-section>
          </div>
          <input id="tab-two" type="radio" name="options" />
          <label for="tab-two">{{ $t("headers") }}</label>
          <div class="tab">
            <pw-section class="orange" label="Headers" ref="headers">
              <ul>
                <li>
                  <div class="flex-wrap">
                    <label for="headerList">{{ $t("header_list") }}</label>
                    <div>
                      <button
                        class="icon"
                        @click="clearContent('headers', $event)"
                        v-tooltip.bottom="'Clear'"
                      >
                        <i class="material-icons">clear_all</i>
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="headerList"
                    readonly
                    v-textarea-auto-height="headerString"
                    v-model="headerString"
                    placeholder="(add at least one header)"
                    rows="1"
                  ></textarea>
                </li>
              </ul>
              <ul v-for="(header, index) in headers" :key="index">
                <li>
                  <input
                    :placeholder="'header ' + (index + 1)"
                    :name="'header' + index"
                    :value="header.key"
                    @change="
                      $store.commit('setKeyHeader', {
                        index,
                        value: $event.target.value
                      })
                    "
                    @keyup.prevent="setRouteQueryState"
                    autofocus
                  />
                </li>
                <li>
                  <input
                    :placeholder="'value ' + (index + 1)"
                    :name="'value' + index"
                    :value="header.value"
                    @change="
                      $store.commit('setValueHeader', {
                        index,
                        value: $event.target.value
                      })
                    "
                    @keyup.prevent="setRouteQueryState"
                  />
                </li>
                <div>
                  <li>
                    <button
                      class="icon"
                      @click="removeRequestHeader(index)"
                      id="header"
                    >
                      <i class="material-icons">delete</i>
                    </button>
                  </li>
                </div>
              </ul>
              <ul>
                <li>
                  <button class="icon" @click="addRequestHeader">
                    <i class="material-icons">add</i>
                    <span>{{ $t("add_new") }}</span>
                  </button>
                </li>
              </ul>
            </pw-section>
          </div>
          <input id="tab-three" type="radio" name="options" />
          <label for="tab-three">{{ $t("parameters") }}</label>
          <div class="tab">
            <pw-section class="pink" label="Parameters" ref="parameters">
              <ul>
                <li>
                  <div class="flex-wrap">
                    <label for="paramList">{{ $t("parameter_list") }}</label>
                    <div>
                      <button
                        class="icon"
                        @click="clearContent('parameters', $event)"
                        v-tooltip.bottom="'Clear'"
                      >
                        <i class="material-icons">clear_all</i>
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="paramList"
                    readonly
                    v-textarea-auto-height="queryString"
                    v-model="queryString"
                    placeholder="(add at least one parameter)"
                    rows="1"
                  ></textarea>
                </li>
              </ul>
              <ul v-for="(param, index) in params" :key="index">
                <li>
                  <input
                    :placeholder="'parameter ' + (index + 1)"
                    :name="'param' + index"
                    :value="param.key"
                    @change="
                      $store.commit('setKeyParams', {
                        index,
                        value: $event.target.value
                      })
                    "
                    autofocus
                  />
                </li>
                <li>
                  <input
                    :placeholder="'value ' + (index + 1)"
                    :name="'value' + index"
                    :value="param.value"
                    @change="
                      $store.commit('setValueParams', {
                        index,
                        value: $event.target.value
                      })
                    "
                  />
                </li>
                <div>
                  <li>
                    <button
                      class="icon"
                      @click="removeRequestParam(index)"
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
          </div>
          <div class="flex-wrap">
            <span></span>
            <button class="icon" @click="activeSidebar = !activeSidebar" v-tooltip="{ content: activeSidebar ? 'Hide Sidebar' : 'Show Sidebar' }">
              <i class="material-icons">{{activeSidebar ? 'chevron_right' : 'chevron_left'}}</i>
            </button>
          </div>
        </section>

        <pw-section
          class="purple"
          id="response"
          label="Response"
          ref="response"
        >
          <ul>
            <li>
              <label for="status">{{ $t("status") }}</label>
              <input
                :class="statusCategory ? statusCategory.className : ''"
                :value="response.status || '(waiting to send request)'"
                ref="status"
                id="status"
                name="status"
                readonly
                type="text"
              />
            </li>
          </ul>
          <ul v-for="(value, key) in response.headers" :key="key">
            <li>
              <label :for="key">{{ key }}</label>
              <input :id="key" :value="value" :name="key" readonly />
            </li>
          </ul>
          <ul v-if="response.body">
            <li>
              <div class="flex-wrap">
                <label for="body">{{ $t("response") }}</label>
                <div>
                  <button
                    class="icon"
                    @click="ToggleExpandResponse"
                    ref="ToggleExpandResponse"
                    v-if="response.body"
                    v-tooltip="{
                      content: !expandResponse
                        ? $t('expand_response')
                        : $t('collapse_response')
                    }"
                  >
                    <i class="material-icons" v-if="!expandResponse"
                      >unfold_more</i
                    >
                    <i class="material-icons" v-else>unfold_less</i>
                  </button>
                  <button
                    class="icon"
                    @click="downloadResponse"
                    ref="downloadResponse"
                    v-if="response.body"
                    v-tooltip="'Download file'"
                  >
                    <i class="material-icons">get_app</i>
                  </button>
                  <button
                    class="icon"
                    @click="copyResponse"
                    ref="copyResponse"
                    v-if="response.body"
                    v-tooltip="'Copy response'"
                  >
                    <i class="material-icons">file_copy</i>
                  </button>
                </div>
              </div>
              <div id="response-details-wrapper">
                <Editor
                  :value="responseBodyText"
                  :lang="responseBodyType"
                  :options="{
                    maxLines: responseBodyMaxLines,
                    minLines: '16',
                    fontSize: '16px',
                    autoScrollEditorIntoView: true,
                    readOnly: true,
                    showPrintMargin: false,
                    useWorker: false
                  }"
                />
                <iframe
                  :class="{ hidden: !previewEnabled }"
                  class="covers-response"
                  ref="previewFrame"
                  src="about:blank"
                ></iframe>
              </div>
              <div
                class="align-right"
                v-if="response.body && responseType === 'text/html'"
              >
                <button class="icon" @click.prevent="togglePreview">
                  <i class="material-icons" v-if="!previewEnabled"
                    >visibility</i
                  >
                  <i class="material-icons" v-else>visibility_off</i>
                  <span>{{
                    previewEnabled ? $t("hide_preview") : $t("preview_html")
                  }}</span>
                </button>
              </div>
            </li>
          </ul>
        </pw-section>
      </div>
      <aside v-if="activeSidebar" class="sticky-inner inner-right">
        <section>
          <input id="history-tab" type="radio" name="side" checked="checked" />
          <label for="history-tab">{{ $t("history") }}</label>
          <div class="tab">
            <history
              @useHistory="handleUseHistory"
              ref="historyComponent"
            ></history>
          </div>
          <input id="collection-tab" type="radio" name="side" />
          <label for="collection-tab">{{ $t("collections") }}</label>
          <div class="tab">
            <pw-section class="yellow" label="Collections" ref="collections">
              <collections />
            </pw-section>
          </div>
        </section>
      </aside>

      <save-request-as
        v-bind:show="showRequestModal"
        v-on:hide-model="hideRequestModal"
        v-bind:editing-request="editRequest"
      ></save-request-as>

      <pw-modal v-if="showModal" @close="showModal = false">
        <div slot="header">
          <ul>
            <li>
              <div class="flex-wrap">
                <h3 class="title">{{ $t("import_curl") }}</h3>
                <div>
                  <button class="icon" @click="showModal = false">
                    <i class="material-icons">close</i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div slot="body">
          <ul>
            <li>
              <textarea
                id="import-text"
                autofocus
                rows="8"
                placeholder="Enter cURL"
              ></textarea>
            </li>
          </ul>
        </div>
        <div slot="footer">
          <ul>
            <li>
              <button class="icon" @click="handleImport">
                <i class="material-icons">get_app</i>
                <span>{{ $t("import") }}</span>
              </button>
            </li>
          </ul>
        </div>
      </pw-modal>

      <pw-modal v-if="!isHidden" @close="isHidden = true">
        <div slot="header">
          <ul>
            <li>
              <div class="flex-wrap">
                <h3 class="title">{{ $t("generate_code") }}</h3>
                <div>
                  <button class="icon" @click="isHidden = true">
                    <i class="material-icons">close</i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div slot="body">
          <ul>
            <li>
              <label for="requestType">{{ $t("request_type") }}</label>
              <select id="requestType" v-model="requestType">
                <option>JavaScript XHR</option>
                <option>Fetch</option>
                <option>cURL</option>
              </select>
            </li>
          </ul>
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="generatedCode">{{ $t("generated_code") }}</label>
                <div>
                  <button
                    class="icon"
                    @click="copyRequestCode"
                    id="copyRequestCode"
                    ref="copyRequestCode"
                    v-tooltip="'Copy code'"
                  >
                    <i class="material-icons">file_copy</i>
                  </button>
                </div>
              </div>
              <textarea
                id="generatedCode"
                ref="generatedCode"
                name="generatedCode"
                rows="8"
                v-model="requestCode"
              ></textarea>
            </li>
          </ul>
        </div>
        <div slot="footer"></div>
      </pw-modal>
    </div>
  </div>
</template>
<script>
import section from "../components/section";
import url from "url";
import querystring from "querystring";
import textareaAutoHeight from "../directives/textareaAutoHeight";
import parseCurlCommand from "../assets/js/curlparser.js";
import getEnvironmentVariablesFromScript from "../functions/preRequest";
import parseTemplateString from "../functions/templating";
import AceEditor from "../components/ace-editor";

const statusCategories = [
  {
    name: "informational",
    statusCodeRegex: new RegExp(/[1][0-9]+/),
    className: "info-response"
  },
  {
    name: "successful",
    statusCodeRegex: new RegExp(/[2][0-9]+/),
    className: "success-response"
  },
  {
    name: "redirection",
    statusCodeRegex: new RegExp(/[3][0-9]+/),
    className: "redir-response"
  },
  {
    name: "client error",
    statusCodeRegex: new RegExp(/[4][0-9]+/),
    className: "cl-error-response"
  },
  {
    name: "server error",
    statusCodeRegex: new RegExp(/[5][0-9]+/),
    className: "sv-error-response"
  },
  {
    // this object is a catch-all for when no other objects match and should always be last
    name: "unknown",
    statusCodeRegex: new RegExp(/.*/),
    className: "missing-data-response"
  }
];
const parseHeaders = xhr => {
  const headers = xhr
    .getAllResponseHeaders()
    .trim()
    .split(/[\r\n]+/);
  const headerMap = {};
  headers.forEach(line => {
    const parts = line.split(": ");
    const header = parts.shift().toLowerCase();
    const value = parts.join(": ");
    headerMap[header] = value;
  });
  return headerMap;
};
export const findStatusGroup = responseStatus =>
  statusCategories.find(status => status.statusCodeRegex.test(responseStatus));

export default {
  directives: {
    textareaAutoHeight
  },

  components: {
    "pw-section": section,
    "pw-toggle": () => import("../components/toggle"),
    "pw-modal": () => import("../components/modal"),
    history: () => import("../components/history"),
    autocomplete: () => import("../components/autocomplete"),
    collections: () => import("../components/collections"),
    saveRequestAs: () => import("../components/collections/saveRequestAs"),
    Editor: AceEditor
  },
  data() {
    return {
      showModal: false,
      showPreRequestScript: false,
      preRequestScript: "// pw.env.set('variable', 'value');",
      copyButton: '<i class="material-icons">file_copy</i>',
      downloadButton: '<i class="material-icons">get_app</i>',
      doneButton: '<i class="material-icons">done</i>',
      isHidden: true,
      response: {
        status: "",
        headers: "",
        body: ""
      },
      previewEnabled: false,
      paramsWatchEnabled: true,
      expandResponse: false,

      /**
       * These are content types that can be automatically
       * serialized by postwoman.
       */
      knownContentTypes: [
        "application/json",
        "application/x-www-form-urlencoded"
      ],

      /**
       * These are a list of Content Types known to Postwoman.
       */
      validContentTypes: [
        "application/json",
        "application/hal+json",
        "application/xml",
        "application/x-www-form-urlencoded",
        "text/html",
        "text/plain"
      ],
      showRequestModal: false,
      editRequest: {},

      urlExcludes: {},
      responseBodyText: "",
      responseBodyType: "text",
      responseBodyMaxLines: 16,
      activeSidebar: true
    };
  },
  watch: {
    urlExcludes: {
      deep: true,
      handler() {
        this.$store.commit("postwoman/applySetting", [
          "URL_EXCLUDES",
          Object.assign({}, this.urlExcludes)
        ]);
      }
    },
    contentType(val) {
      this.rawInput = !this.knownContentTypes.includes(val);
    },
    rawInput(status) {
      if (status && this.rawParams === "") this.rawParams = "{}";
      else this.setRouteQueryState();
    },
    "response.body": function(val) {
      if (
        this.response.body === "(waiting to send request)" ||
        this.response.body === "Loading..."
      ) {
        this.responseBodyText = this.response.body;
        this.responseBodyType = "text";
      } else {
        if (
          this.responseType === "application/json" ||
          this.responseType === "application/hal+json"
        ) {
          this.responseBodyText = JSON.stringify(this.response.body, null, 2);
          this.responseBodyType = "json";
        } else if (this.responseType === "text/html") {
          this.responseBodyText = this.response.body;
          this.responseBodyType = "html";
        } else {
          this.responseBodyText = this.response.body;
          this.responseBodyType = "text";
        }
      }
    },
    params: {
      handler: function(newValue) {
        if (!this.paramsWatchEnabled) {
          this.paramsWatchEnabled = true;
          return;
        }
        let path = this.path;
        let queryString = newValue
          .filter(({ key }) => !!key)
          .map(({ key, value }) => `${key}=${value}`)
          .join("&");
        queryString = queryString === "" ? "" : `?${queryString}`;
        if (path.includes("?")) {
          path = path.slice(0, path.indexOf("?")) + queryString;
        } else {
          path = path + queryString;
        }

        this.path = path;
      },
      deep: true
    },
    selectedRequest(newValue, oldValue) {
      // @TODO: Convert all variables to single request variable
      if (!newValue) return;
      this.url = newValue.url;
      this.path = newValue.path;
      this.method = newValue.method;
      this.auth = newValue.auth;
      this.httpUser = newValue.httpUser;
      this.httpPassword = newValue.httpPassword;
      this.passwordFieldType = newValue.passwordFieldType;
      this.bearerToken = newValue.bearerToken;
      this.headers = newValue.headers;
      this.params = newValue.params;
      this.bodyParams = newValue.bodyParams;
      this.rawParams = newValue.rawParams;
      this.rawInput = newValue.rawInput;
      this.contentType = newValue.contentType;
      this.requestType = newValue.requestType;
    },
    editingRequest(newValue) {
      this.editRequest = newValue;
      this.showRequestModal = true;
    }
  },
  computed: {
    url: {
      get() {
        return this.$store.state.request.url;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "url" });
      }
    },
    method: {
      get() {
        return this.$store.state.request.method;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "method" });
      }
    },
    path: {
      get() {
        return this.$store.state.request.path;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "path" });
      }
    },
    label: {
      get() {
        return this.$store.state.request.label;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "label" });
      }
    },
    auth: {
      get() {
        return this.$store.state.request.auth;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "auth" });
      }
    },
    httpUser: {
      get() {
        return this.$store.state.request.httpUser;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "httpUser" });
      }
    },
    httpPassword: {
      get() {
        return this.$store.state.request.httpPassword;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "httpPassword" });
      }
    },
    bearerToken: {
      get() {
        return this.$store.state.request.bearerToken;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "bearerToken" });
      }
    },
    headers: {
      get() {
        return this.$store.state.request.headers;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "headers" });
      }
    },
    params: {
      get() {
        return this.$store.state.request.params;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "params" });
      }
    },
    bodyParams: {
      get() {
        return this.$store.state.request.bodyParams;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "bodyParams" });
      }
    },
    rawParams: {
      get() {
        return this.$store.state.request.rawParams;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "rawParams" });
      }
    },
    rawInput: {
      get() {
        return this.$store.state.request.rawInput;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "rawInput" });
      }
    },
    requestType: {
      get() {
        return this.$store.state.request.requestType;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "requestType" });
      }
    },
    contentType: {
      get() {
        return this.$store.state.request.contentType;
      },
      set(value) {
        this.$store.commit("setState", { value, attribute: "contentType" });
      }
    },
    passwordFieldType: {
      get() {
        return this.$store.state.request.passwordFieldType;
      },
      set(value) {
        this.$store.commit("setState", {
          value,
          attribute: "passwordFieldType"
        });
      }
    },

    selectedRequest() {
      return this.$store.state.postwoman.selectedRequest;
    },
    editingRequest() {
      return this.$store.state.postwoman.editingRequest;
    },
    requestName() {
      return this.label;
    },
    statusCategory() {
      return findStatusGroup(this.response.status);
    },
    isValidURL() {
      if (this.showPreRequestScript) {
        // we cannot determine if a URL is valid because the full string is not known ahead of time
        return true;
      }
      const protocol = "^(https?:\\/\\/)?";
      const validIP = new RegExp(
        protocol +
          "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$"
      );
      const validHostname = new RegExp(
        protocol +
          "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$"
      );
      return validIP.test(this.url) || validHostname.test(this.url);
    },
    hasRequestBody() {
      return ["POST", "PUT", "PATCH"].includes(this.method);
    },
    pathName() {
      return this.path.match(/^([^?]*)\??/)[1];
    },
    rawRequestBody() {
      const { bodyParams } = this;
      if (this.contentType === "application/json") {
        try {
          const obj = JSON.parse(
            `{${bodyParams
              .filter(({ key }) => !!key)
              .map(
                ({ key, value }) => `
              "${key}": "${value}"
              `
              )
              .join()}}`
          );
          return JSON.stringify(obj);
        } catch (ex) {
          return "invalid";
        }
      } else {
        return bodyParams
          .filter(({ key }) => !!key)
          .map(({ key, value }) => `${key}=${encodeURIComponent(value)}`)
          .join("&");
      }
    },
    headerString() {
      const result = this.headers
        .filter(({ key }) => !!key)
        .map(({ key, value }) => `${key}: ${value}`)
        .join(",\n");
      return result === "" ? "" : `${result}`;
    },
    queryString() {
      const result = this.params
        .filter(({ key }) => !!key)
        .map(({ key, value }) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      return result === "" ? "" : `?${result}`;
    },
    responseType() {
      return (this.response.headers["content-type"] || "")
        .split(";")[0]
        .toLowerCase();
    },
    requestCode() {
      if (this.requestType === "JavaScript XHR") {
        const requestString = [];
        requestString.push("const xhr = new XMLHttpRequest()");
        const user = this.auth === "Basic" ? "'" + this.httpUser + "'" : null;
        const pswd =
          this.auth === "Basic" ? "'" + this.httpPassword + "'" : null;
        requestString.push(
          "xhr.open('" +
            this.method +
            "', '" +
            this.url +
            this.pathName +
            this.queryString +
            "', true, " +
            user +
            ", " +
            pswd +
            ")"
        );
        if (this.auth === "Bearer Token") {
          requestString.push(
            "xhr.setRequestHeader('Authorization', 'Bearer " +
              this.bearerToken +
              "')"
          );
        }
        if (this.headers) {
          this.headers.forEach(element => {
            requestString.push(
              "xhr.setRequestHeader('" +
                element.key +
                "', '" +
                element.value +
                "')"
            );
          });
        }
        if (["POST", "PUT", "PATCH"].includes(this.method)) {
          const requestBody = this.rawInput
            ? this.rawParams
            : this.rawRequestBody;
          requestString.push(
            "xhr.setRequestHeader('Content-Length', " + requestBody.length + ")"
          );
          requestString.push(
            "xhr.setRequestHeader('Content-Type', '" +
              this.contentType +
              "; charset=utf-8')"
          );
          requestString.push("xhr.send(" + requestBody + ")");
        } else {
          requestString.push("xhr.send()");
        }
        return requestString.join("\n");
      } else if (this.requestType == "Fetch") {
        const requestString = [];
        let headers = [];
        requestString.push(
          'fetch("' + this.url + this.pathName + this.queryString + '", {\n'
        );
        requestString.push('  method: "' + this.method + '",\n');
        if (this.auth === "Basic") {
          const basic = this.httpUser + ":" + this.httpPassword;
          headers.push(
            '    "Authorization": "Basic ' +
              window.btoa(unescape(encodeURIComponent(basic))) +
              '",\n'
          );
        } else if (this.auth === "Bearer Token") {
          headers.push(
            '    "Authorization": "Bearer ' + this.bearerToken + '",\n'
          );
        }
        if (["POST", "PUT", "PATCH"].includes(this.method)) {
          const requestBody = this.rawInput
            ? this.rawParams
            : this.rawRequestBody;
          requestString.push("  body: " + requestBody + ",\n");
          headers.push('    "Content-Length": ' + requestBody.length + ",\n");
          headers.push(
            '    "Content-Type": "' + this.contentType + '; charset=utf-8",\n'
          );
        }
        if (this.headers) {
          this.headers.forEach(element => {
            headers.push(
              '    "' + element.key + '": "' + element.value + '",\n'
            );
          });
        }
        headers = headers.join("").slice(0, -2);
        requestString.push("  headers: {\n" + headers + "\n  },\n");
        requestString.push('  credentials: "same-origin"\n');
        requestString.push("}).then(function(response) {\n");
        requestString.push("  response.status\n");
        requestString.push("  response.statusText\n");
        requestString.push("  response.headers\n");
        requestString.push("  response.url\n\n");
        requestString.push("  return response.text()\n");
        requestString.push("}).catch(function(error) {\n");
        requestString.push("  error.message\n");
        requestString.push("})");
        return requestString.join("");
      } else if (this.requestType === "cURL") {
        const requestString = [];
        requestString.push("curl -X " + this.method + " \\\n");
        requestString.push(
          "  '" + this.url + this.pathName + this.queryString + "' \\\n"
        );
        if (this.auth === "Basic") {
          const basic = this.httpUser + ":" + this.httpPassword;
          requestString.push(
            "  -H 'Authorization: Basic " +
              window.btoa(unescape(encodeURIComponent(basic))) +
              "' \\\n"
          );
        } else if (this.auth === "Bearer Token") {
          requestString.push(
            "  -H 'Authorization: Bearer " + this.bearerToken + "' \\\n"
          );
        }
        if (this.headers) {
          this.headers.forEach(element => {
            requestString.push(
              "  -H '" + element.key + ": " + element.value + "' \\\n"
            );
          });
        }
        if (["POST", "PUT", "PATCH"].includes(this.method)) {
          const requestBody = this.rawInput
            ? this.rawParams
            : this.rawRequestBody;
          requestString.push(
            "  -H 'Content-Length: " + requestBody.length + "' \\\n"
          );
          requestString.push(
            "  -H 'Content-Type: " + this.contentType + "; charset=utf-8' \\\n"
          );
          requestString.push("  -d '" + requestBody + "' \\\n");
        }
        return requestString.join("").slice(0, -3);
      }
    }
  },
  methods: {
    scrollInto(view) {
      this.$refs[view].$el.scrollIntoView({
        behavior: "smooth"
      });
    },
    handleUseHistory({
      label,
      method,
      url,
      path,
      usesScripts,
      preRequestScript
    }) {
      this.label = label;
      this.method = method;
      this.url = url;
      this.path = path;
      this.showPreRequestScript = usesScripts;
      this.preRequestScript = preRequestScript;
      this.scrollInto("request");
    },
    getVariablesFromPreRequestScript() {
      if (!this.preRequestScript) {
        return {};
      }
      return getEnvironmentVariablesFromScript(this.preRequestScript);
    },
    async makeRequest(auth, headers, requestBody, preRequestScript) {
      const requestOptions = {
        method: this.method,
        url: this.url + this.pathName + this.queryString,
        auth,
        headers,
        data: requestBody ? requestBody.toString() : null
      };
      if (preRequestScript) {
        const environmentVariables = getEnvironmentVariablesFromScript(
          preRequestScript
        );
        requestOptions.url = parseTemplateString(
          requestOptions.url,
          environmentVariables
        );
        requestOptions.data = parseTemplateString(
          requestOptions.data,
          environmentVariables
        );
        for (let k in requestOptions.headers) {
          const kParsed = parseTemplateString(k, environmentVariables);
          const valParsed = parseTemplateString(
            requestOptions.headers[k],
            environmentVariables
          );
          delete requestOptions.headers[k];
          requestOptions.headers[kParsed] = valParsed;
        }
      }
      if (typeof requestOptions.data === "string") {
        requestOptions.data = parseTemplateString(requestOptions.data);
      }
      const config = this.$store.state.postwoman.settings.PROXY_ENABLED
        ? {
            method: "POST",
            url:
              this.$store.state.postwoman.settings.PROXY_URL ||
              "https://postwoman.apollotv.xyz/",
            data: requestOptions
          }
        : requestOptions;

      const response = await this.$axios(config);
      return this.$store.state.postwoman.settings.PROXY_ENABLED
        ? response.data
        : response;
    },
    async sendRequest() {
      this.$toast.clear();
      this.scrollInto("response");

      if (!this.isValidURL) {
        this.$toast.error("URL is not formatted properly", {
          icon: "error"
        });
        return;
      }

      // Start showing the loading bar as soon as possible.
      // The nuxt axios module will hide it when the request is made.
      this.$nuxt.$loading.start();

      if (this.$refs.response.$el.classList.contains("hidden")) {
        this.$refs.response.$el.classList.toggle("hidden");
      }
      this.previewEnabled = false;
      this.response.status = "Fetching...";
      this.response.body = "Loading...";

      const auth =
        this.auth === "Basic"
          ? {
              username: this.httpUser,
              password: this.httpPassword
            }
          : null;

      let headers = {};
      let headersObject = {};

      Object.keys(headers).forEach(id => {
        headersObject[headers[id].key] = headers[id].value;
      });
      headers = headersObject;

      // If the request has a body, we want to ensure Content-Length and
      // Content-Type are sent.
      let requestBody;
      if (this.hasRequestBody) {
        requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;

        Object.assign(headers, {
          //'Content-Length': requestBody.length,
          "Content-Type": `${this.contentType}; charset=utf-8`
        });
      }

      // If the request uses a token for auth, we want to make sure it's sent here.
      if (this.auth === "Bearer Token")
        headers["Authorization"] = `Bearer ${this.bearerToken}`;

      headers = Object.assign(
        // Clone the app headers object first, we don't want to
        // mutate it with the request headers added by default.
        Object.assign({}, this.headers)

        // We make our temporary headers object the source so
        // that you can override the added headers if you
        // specify them.
        // headers
      );

      Object.keys(headers).forEach(id => {
        headersObject[headers[id].key] = headers[id].value;
      });
      headers = headersObject;

      try {
        const startTime = Date.now();

        const payload = await this.makeRequest(
          auth,
          headers,
          requestBody,
          this.showPreRequestScript && this.preRequestScript
        );

        const duration = Date.now() - startTime;
        this.$toast.info(`Finished in ${duration}ms`, {
          icon: "done"
        });

        (() => {
          const status = (this.response.status = payload.status);
          const headers = (this.response.headers = payload.headers);

          // We don't need to bother parsing JSON, axios already handles it for us!
          const body = (this.response.body = payload.data);

          const date = new Date().toLocaleDateString();
          const time = new Date().toLocaleTimeString();

          // Addition of an entry to the history component.
          const entry = {
            label: this.requestName,
            status,
            date,
            time,
            method: this.method,
            url: this.url,
            path: this.path,
            usesScripts: Boolean(this.preRequestScript),
            preRequestScript: this.preRequestScript,
            duration,
            star: false
          };
          this.$refs.historyComponent.addEntry(entry);
        })();
      } catch (error) {
        console.error(error);
        if (error.response) {
          this.response.headers = error.response.headers;
          this.response.status = error.response.status;
          this.response.body = error.response.data;

          // Addition of an entry to the history component.
          const entry = {
            label: this.requestName,
            status: this.response.status,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            method: this.method,
            url: this.url,
            path: this.path,
            usesScripts: Boolean(this.preRequestScript),
            preRequestScript: this.preRequestScript
          };
          this.$refs.historyComponent.addEntry(entry);
          return;
        } else {
          this.response.status = error.message;
          this.response.body = error + ". Check console for details.";
          this.$toast.error(error + " (F12 for details)", {
            icon: "error"
          });
          if (!this.$store.state.postwoman.settings.PROXY_ENABLED) {
            this.$toast.info("Try enabling Proxy", {
              icon: "help",
              duration: 8000,
              action: {
                text: "Settings",
                onClick: (e, toastObject) => {
                  this.$router.push({ path: "/settings" });
                }
              }
            });
          }
        }
      }
    },
    getQueryStringFromPath() {
      let queryString,
        pathParsed = url.parse(this.path);
      return (queryString = pathParsed.query ? pathParsed.query : "");
    },
    queryStringToArray(queryString) {
      let queryParsed = querystring.parse(queryString);
      return Object.keys(queryParsed).map(key => ({
        key: key,
        value: queryParsed[key]
      }));
    },
    pathInputHandler() {
      let queryString = this.getQueryStringFromPath(),
        params = this.queryStringToArray(queryString);

      this.paramsWatchEnabled = false;
      this.params = params;
    },
    addRequestHeader() {
      this.$store.commit("addHeaders", {
        key: "",
        value: ""
      });
      return false;
    },
    removeRequestHeader(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldHeaders = this.headers.slice();

      this.$store.commit("removeHeaders", index);
      this.$toast.error("Deleted", {
        icon: "delete",
        action: {
          text: "Undo",
          onClick: (e, toastObject) => {
            this.headers = oldHeaders;
            toastObject.remove();
          }
        }
      });
    },
    addRequestParam() {
      this.$store.commit("addParams", { key: "", value: "" });
      return false;
    },
    removeRequestParam(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldParams = this.params.slice();

      this.$store.commit("removeParams", index);
      this.$toast.error("Deleted", {
        icon: "delete",
        action: {
          text: "Undo",
          onClick: (e, toastObject) => {
            this.params = oldParams;
            toastObject.remove();
          }
        }
      });
    },
    addRequestBodyParam() {
      this.$store.commit("addBodyParams", { key: "", value: "" });
      return false;
    },
    removeRequestBodyParam(index) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldBodyParams = this.bodyParams.slice();

      this.$store.commit("removeBodyParams", index);
      this.$toast.error("Deleted", {
        icon: "delete",
        action: {
          text: "Undo",
          onClick: (e, toastObject) => {
            this.bodyParams = oldBodyParams;
            toastObject.remove();
          }
        }
      });
    },
    formatRawParams(event) {
      if (event.which !== 13 && event.which !== 9) {
        return;
      }
      const textBody = event.target.value;
      const textBeforeCursor = textBody.substring(
        0,
        event.target.selectionStart
      );
      const textAfterCursor = textBody.substring(event.target.selectionEnd);
      if (event.which === 13) {
        event.preventDefault();
        const oldSelectionStart = event.target.selectionStart;
        const lastLine = textBeforeCursor.split("\n").slice(-1)[0];
        const rightPadding = lastLine.match(/([\s\t]*).*/)[1] || "";
        event.target.value =
          textBeforeCursor + "\n" + rightPadding + textAfterCursor;
        setTimeout(
          () =>
            (event.target.selectionStart = event.target.selectionEnd =
              oldSelectionStart + rightPadding.length + 1),
          1
        );
      } else if (event.which === 9) {
        event.preventDefault();
        const oldSelectionStart = event.target.selectionStart;
        event.target.value = textBeforeCursor + "\xa0\xa0" + textAfterCursor;
        event.target.selectionStart = event.target.selectionEnd =
          oldSelectionStart + 2;
        return false;
      }
    },
    copyRequest() {
      if (navigator.share) {
        let time = new Date().toLocaleTimeString();
        let date = new Date().toLocaleDateString();
        navigator
          .share({
            title: `Postwoman`,
            text: `Postwoman • API request builder at ${time} on ${date}`,
            url: window.location.href
          })
          .then(() => {})
          .catch(console.error);
      } else {
        const dummy = document.createElement("input");
        document.body.appendChild(dummy);
        dummy.value = window.location.href;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
        this.$refs.copyRequest.innerHTML = this.doneButton;
        this.$toast.info("Copied to clipboard", {
          icon: "done"
        });
        setTimeout(
          () => (this.$refs.copyRequest.innerHTML = this.copyButton),
          1000
        );
      }
    },
    copyRequestCode() {
      this.$refs.copyRequestCode.innerHTML = this.doneButton;
      this.$toast.success("Copied to clipboard", {
        icon: "done"
      });
      this.$refs.generatedCode.select();
      document.execCommand("copy");
      setTimeout(
        () => (this.$refs.copyRequestCode.innerHTML = this.copyButton),
        1000
      );
    },
    ToggleExpandResponse() {
      this.expandResponse = !this.expandResponse;
      this.responseBodyMaxLines =
        this.responseBodyMaxLines == Infinity ? 16 : Infinity;
    },
    copyResponse() {
      this.$refs.copyResponse.innerHTML = this.doneButton;
      this.$toast.success("Copied to clipboard", {
        icon: "done"
      });
      const aux = document.createElement("textarea");
      const copy =
        this.responseType == "application/json"
          ? JSON.stringify(this.response.body)
          : this.response.body;
      aux.innerText = copy;
      document.body.appendChild(aux);
      aux.select();
      document.execCommand("copy");
      document.body.removeChild(aux);
      setTimeout(
        () => (this.$refs.copyResponse.innerHTML = this.copyButton),
        1000
      );
    },
    downloadResponse() {
      const dataToWrite = JSON.stringify(this.response.body, null, 2);
      const file = new Blob([dataToWrite], { type: this.responseType });
      const a = document.createElement("a"),
        url = URL.createObjectURL(file);
      a.href = url;
      a.download = (
        this.url +
        this.path +
        " [" +
        this.method +
        "] on " +
        Date()
      ).replace(/\./g, "[dot]");
      document.body.appendChild(a);
      a.click();
      this.$refs.downloadResponse.innerHTML = this.doneButton;
      this.$toast.success("Download started", {
        icon: "done"
      });
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.$refs.downloadResponse.innerHTML = this.downloadButton;
      }, 1000);
    },
    togglePreview() {
      this.previewEnabled = !this.previewEnabled;
      if (this.previewEnabled) {
        // If you want to add 'preview' support for other response types,
        // just add them here.
        if (this.responseType === "text/html") {
          // If the preview already has that URL loaded, let's not bother re-loading it all.
          if (
            this.$refs.previewFrame.getAttribute("data-previewing-url") ===
            this.url
          )
            return;
          // Use DOMParser to parse document HTML.
          const previewDocument = new DOMParser().parseFromString(
            this.response.body,
            this.responseType
          );
          // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
          previewDocument.head.innerHTML =
            `<base href="${this.url}">` + previewDocument.head.innerHTML;
          // Finally, set the iframe source to the resulting HTML.
          this.$refs.previewFrame.srcdoc =
            previewDocument.documentElement.outerHTML;
          this.$refs.previewFrame.setAttribute("data-previewing-url", this.url);
        }
      }
    },
    setRouteQueryState() {
      const flat = key => (this[key] !== "" ? `${key}=${this[key]}&` : "");
      const deep = key => {
        const haveItems = [...this[key]].length;
        if (haveItems && this[key]["value"] !== "") {
          return `${key}=${JSON.stringify(this[key])}&`;
        } else return "";
      };
      let flats = [
        "method",
        "url",
        "path",
        !this.urlExcludes.auth ? "auth" : null,
        !this.urlExcludes.httpUser ? "httpUser" : null,
        !this.urlExcludes.httpPassword ? "httpPassword" : null,
        !this.urlExcludes.bearerToken ? "bearerToken" : null,
        "contentType"
      ]
        .filter(item => item !== null)
        .map(item => flat(item));
      let deeps = ["headers", "params"].map(item => deep(item));
      let bodyParams = this.rawInput
        ? [flat("rawParams")]
        : [deep("bodyParams")];

      this.$router.replace(
        "/?" +
          flats
            .concat(deeps, bodyParams)
            .join("")
            .slice(0, -1)
      );
    },
    setRouteQueries(queries) {
      if (typeof queries !== "object")
        throw new Error("Route query parameters must be a Object");
      for (const key in queries) {
        if (["headers", "params", "bodyParams"].includes(key))
          this[key] = JSON.parse(queries[key]);
        if (key === "rawParams") {
          this.rawInput = true;
          this.rawParams = queries["rawParams"];
        } else if (typeof this[key] === "string") this[key] = queries[key];
      }
    },
    observeRequestButton() {
      const requestElement = this.$refs.request.$el;
      const sendButtonElement = this.$refs.sendButton;
      const observer = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting)
              sendButtonElement.classList.remove("show");
            // The button should float when it is no longer visible on screen.
            // This is done by adding the show class to the button.
            else sendButtonElement.classList.add("show");
          });
        },
        {
          rootMargin: "0px",
          threshold: [0]
        }
      );
      observer.observe(requestElement);
    },
    handleImport() {
      let textarea = document.getElementById("import-text");
      let text = textarea.value;
      try {
        let parsedCurl = parseCurlCommand(text);
        this.url = parsedCurl.url.replace(/"/g, "").replace(/'/g, "");
        this.url =
          this.url.slice(-1).pop() == "/" ? this.url.slice(0, -1) : this.url;
        this.path = "";
        this.headers = [];
        for (const key of Object.keys(parsedCurl.headers)) {
          this.$store.commit("addHeaders", {
            key: key,
            value: parsedCurl.headers[key]
          });
        }
        this.method = parsedCurl.method.toUpperCase();
        if (parsedCurl["data"]) {
          this.rawInput = true;
          this.rawParams = parsedCurl["data"];
        }
        this.showModal = false;
      } catch (error) {
        this.showModal = false;
        this.$toast.error("cURL is not formatted properly", {
          icon: "error"
        });
      }
    },
    switchVisibility() {
      this.passwordFieldType =
        this.passwordFieldType === "password" ? "text" : "password";
    },
    clearContent(name, e) {
      switch (name) {
        case "auth":
          this.auth = "None";
          this.httpUser = "";
          this.httpPassword = "";
          this.bearerToken = "";
          break;
        case "headers":
          this.headers = [];
          break;
        case "parameters":
          this.params = [];
          break;
        default:
          (this.label = ""),
            (this.method = "GET"),
            (this.url = "https://reqres.in"),
            (this.auth = "None"),
            (this.path = "/api/users"),
            (this.auth = "None");
          this.httpUser = "";
          this.httpPassword = "";
          this.bearerToken = "";
          this.headers = [];
          this.params = [];
          this.bodyParams = [];
          this.rawParams = "";
      }
      e.target.innerHTML = this.doneButton;
      this.$toast.info("Cleared", {
        icon: "clear_all"
      });
      setTimeout(
        () => (e.target.innerHTML = '<i class="material-icons">clear_all</i>'),
        1000
      );
    },
    saveRequest() {
      this.editRequest = {
        url: this.url,
        path: this.path,
        method: this.method,
        auth: this.auth,
        httpUser: this.httpUser,
        httpPassword: this.httpPassword,
        passwordFieldType: this.passwordFieldType,
        bearerToken: this.bearerToken,
        headers: this.headers,
        params: this.params,
        bodyParams: this.bodyParams,
        rawParams: this.rawParams,
        rawInput: this.rawInput,
        contentType: this.contentType,
        requestType: this.requestType
      };

      if (this.selectedRequest.url) {
        this.editRequest = Object.assign(
          {},
          this.selectedRequest,
          this.editRequest
        );
      }

      this.showRequestModal = true;
    },
    hideRequestModal() {
      this.showRequestModal = false;
      this.editRequest = {};
    },
    setExclude(excludedField, excluded) {
      if (excludedField === "auth") {
        this.urlExcludes.auth = excluded;
        this.urlExcludes.httpUser = excluded;
        this.urlExcludes.httpPassword = excluded;
        this.urlExcludes.bearerToken = excluded;
      } else {
        this.urlExcludes[excludedField] = excluded;
      }
      this.setRouteQueryState();
    },
    methodChange() {
      // this.$store.commit('setState', { 'value': ["POST", "PUT", "PATCH"].includes(this.method) ? 'application/json' : '', 'attribute': 'contentType' })
      this.contentType = ["POST", "PUT", "PATCH"].includes(this.method)
        ? "application/json"
        : "";
    },
    uploadPayload() {
      this.rawInput = true;
      let file = this.$refs.payload.files[0];
      if (file !== null) {
        let reader = new FileReader();
        reader.onload = e => {
          this.rawParams = e.target.result;
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
    }
  },
  mounted() {
    this.observeRequestButton();
    this._keyListener = function(e) {
      if (e.key === "g" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.sendRequest();
      } else if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.saveRequest();
      } else if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.copyRequest();
      } else if (e.key === "j" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.$refs.clearAll.click();
      }
    };
    document.addEventListener("keydown", this._keyListener.bind(this));
  },
  created() {
    this.urlExcludes = this.$store.state.postwoman.settings.URL_EXCLUDES || {
      // Exclude authentication by default for security reasons.
      auth: true,
      httpUser: true,
      httpPassword: true,
      bearerToken: true
    };

    if (Object.keys(this.$route.query).length)
      this.setRouteQueries(this.$route.query);
    this.$watch(
      vm => [
        vm.label,
        vm.method,
        vm.url,
        vm.auth,
        vm.path,
        vm.httpUser,
        vm.httpPassword,
        vm.bearerToken,
        vm.headers,
        vm.params,
        vm.bodyParams,
        vm.contentType,
        vm.rawParams
      ],
      val => {
        this.setRouteQueryState();
      }
    );
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener);
  }
};
</script>
