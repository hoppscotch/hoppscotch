<template>
  <div class="page">
    <pw-modal v-if="showModal" @close="showModal = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">Import cURL</h3>
              <div>
                <button class="icon" @click="toggleModal">
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
            <textarea id="import-text" autofocus rows="8" placeholder="Enter cURL"></textarea>
          </li>
        </ul>
      </div>
      <div slot="footer">
        <ul>
          <li>
            <button class="icon" @click="handleImport">
              <i class="material-icons">get_app</i>
              <span>Import</span>
            </button>
          </li>
        </ul>
      </div>
    </pw-modal>
    <pw-section class="blue" label="Request" ref="request">
      <ul>
        <li>
          <label for="method">Method</label>
          <select id="method" v-model="method">
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
          <label for="url">URL</label>
          <input :class="{ error: !isValidURL }" @keyup.enter="isValidURL ? sendRequest() : null" id="url" name="url" type="url" v-model="url">
        </li>
        <li>
          <label for="path">Path</label>
          <input @keyup.enter="isValidURL ? sendRequest() : null" id="path" name="path" v-model="path" @input="pathInputHandler">
        </li>
        <li>
          <label class="hide-on-small-screen" for="copyRequest">&nbsp;</label>
          <button class="icon" @click="copyRequest" id="copyRequest" ref="copyRequest" :disabled="!isValidURL">
            <i class="material-icons">share</i>
            <span>Permalink</span>
          </button>
        </li>
        <li>
          <label class="hide-on-small-screen" for="code">&nbsp;</label>
          <button class="icon" id="code" v-on:click="isHidden = !isHidden" :disabled="!isValidURL">
            <i class="material-icons" v-if="isHidden">visibility</i>
            <i class="material-icons" v-if="!isHidden">visibility_off</i>
            <span>{{ isHidden ? 'Show Code' : 'Hide Code' }}</span>
          </button>
        </li>
        <li>
          <label class="hide-on-small-screen" for="send">&nbsp;</label>
          <button :disabled="!isValidURL" @click="sendRequest" class="show" id="send" ref="sendButton">
            Send <span id="hidden-message">Again</span>
            <span><i class="material-icons">send</i></span>
          </button>
        </li>
      </ul>
      <div class="blue" label="Request Body" v-if="method === 'POST' || method === 'PUT' || method === 'PATCH'">
        <ul>
          <li>
            <label for="contentType">Content Type</label>
            <autocomplete :source="validContentTypes" :spellcheck="false" v-model="contentType">Content Type</autocomplete>
          </li>
        </ul>
        <ul>
          <li>
            <span>
              <pw-toggle :on="rawInput" @change="rawInput = !rawInput">
                Raw Input {{ rawInput ? "Enabled" : "Disabled" }}
              </pw-toggle>
            </span>
          </li>
        </ul>
        <div v-if="!rawInput">
          <ul>
            <li>
              <label for="reqParamList">Parameter List</label>
              <textarea id="reqParamList" readonly v-textarea-auto-height="rawRequestBody" v-model="rawRequestBody" placeholder="(add at least one parameter)" rows="1"></textarea>
            </li>
          </ul>
          <ul v-for="(param, index) in bodyParams" :key="index">
            <li>
              <input :placeholder="'key '+(index+1)" :name="'bparam'+index" v-model="param.key" @keyup.prevent="setRouteQueryState" autofocus>
            </li>
            <li>
              <input :placeholder="'value '+(index+1)" :id="'bvalue'+index" :name="'bvalue'+index" v-model="param.value" @keyup.prevent="setRouteQueryState">
            </li>
            <div>
              <li>
                <button class="icon" @click="removeRequestBodyParam(index)" id="delParam">
                  <i class="material-icons">delete</i>
                </button>
              </li>
            </div>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="addRequestBodyParam" name="addrequest">
                <i class="material-icons">add</i>
                <span>Add New</span>
              </button>
            </li>
          </ul>
        </div>
        <div v-else>
          <ul>
            <li>
              <label for="rawBody">Raw Request Body</label>
              <textarea id="rawBody" @keydown="formatRawParams" rows="8" v-model="rawParams" v-textarea-auto-height="rawParams"></textarea>
            </li>
          </ul>
        </div>
      </div>
      <ul>
        <li>
          <input id="label" name="label" type="text" v-model="label" placeholder="Label request">
        </li>
      </ul>
      <div class="flex-wrap">
        <button class="icon" id="show-modal" @click="showModal = true">
          <i class="material-icons">import_export</i>
          <span>Import cURL</span>
        </button>
        <button class="icon" @click="clearContent">
          <i class="material-icons">clear_all</i>
          <span>Clear all</span>
        </button>
      </div>
    </pw-section>
    <pw-section class="yellow" label="Code" ref="requestCode" v-if="!isHidden">
      <ul>
        <li>
          <label for="requestType">Request Type</label>
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
            <label for="generatedCode">Generated Code</label>
            <div>
              <button class="icon" @click="copyRequestCode" id="copyRequestCode" ref="copyRequestCode">
                <i class="material-icons">file_copy</i>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <textarea id="generatedCode" ref="generatedCode" name="generatedCode" rows="8" v-model="requestCode"></textarea>
        </li>
      </ul>
    </pw-section>
    <pw-section class="purple" id="response" label="Response" ref="response">
      <ul>
        <li>
          <label for="status">status</label>
          <input :class="statusCategory ? statusCategory.className : ''" :value="response.status || '(waiting to send request)'" ref="status" id="status" name="status" readonly type="text">
        </li>
      </ul>
      <ul v-for="(value, key) in response.headers" :key="key">
        <li>
          <label :for="key">{{key}}</label>
          <input :id="key" :value="value" :name="key" readonly>
        </li>
      </ul>
      <ul v-if="response.body">
        <li>
          <div class="flex-wrap">
            <label for="body">response</label>
            <div>
              <button class="icon" @click="copyResponse" ref="copyResponse" v-if="response.body">
                <i class="material-icons">file_copy</i>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div id="response-details-wrapper">
            <pre><code ref="responseBody" id="body" rows="16" placeholder="(waiting to send request)">{{response.body}}</code></pre>
            <iframe :class="{hidden: !previewEnabled}" class="covers-response" ref="previewFrame" src="about:blank"></iframe>
          </div>
          <div class="align-right" v-if="response.body && responseType === 'text/html'">
            <button class="icon" @click.prevent="togglePreview">
              <i class="material-icons" v-if="!previewEnabled">visibility</i>
              <i class="material-icons" v-if="previewEnabled">visibility_off</i>
              <span>{{ previewEnabled ? 'Hide Preview' : 'Preview HTML' }}</span>
            </button>
          </div>
        </li>
      </ul>
    </pw-section>
    <section>
      <input id="tab-one" type="radio" name="grp" checked="checked">
      <label for="tab-one">Authentication</label>
      <div class="tab">
        <pw-section class="cyan" label="Authentication">
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="auth">Authentication Type</label>
                <div>
                  <button class="icon" @click="clearContent('auth')">
                    <i class="material-icons">clear_all</i>
                    <span>Clear</span>
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
              <input placeholder="User" name="http_basic_user" v-model="httpUser">
            </li>
            <li>
              <input placeholder="Password" name="http_basic_passwd" :type="passwordFieldType" v-model="httpPassword">
            </li>
            <div>
              <li>
                <button class="icon" id="switchVisibility" ref="switchVisibility" @click="switchVisibility">
                  <i class="material-icons" v-if="passwordFieldType === 'text'">visibility</i>
                  <i class="material-icons" v-if="passwordFieldType !== 'text'">visibility_off</i>
                </button>
              </li>
            </div>
          </ul>
          <ul v-if="auth === 'Bearer Token'">
            <li>
              <input placeholder="Token" name="bearer_token" v-model="bearerToken">
            </li>
          </ul>
        </pw-section>
      </div>
      <input id="tab-two" type="radio" name="grp">
      <label for="tab-two">Headers</label>
      <div class="tab">
        <pw-section class="orange" label="Headers">
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="headerList">Header List</label>
                <div>
                  <button class="icon" @click="clearContent('headers')">
                    <i class="material-icons">clear_all</i>
                    <span>Clear</span>
                  </button>
                </div>
              </div>
              <textarea id="headerList" readonly v-textarea-auto-height="headerString" v-model="headerString" placeholder="(add at least one header)" rows="1"></textarea>
            </li>
          </ul>
          <ul v-for="(header, index) in headers" :key="index">
            <li>
              <input :placeholder="'header '+(index+1)" :name="'header'+index" v-model="header.key" @keyup.prevent="setRouteQueryState" autofocus>
            </li>
            <li>
              <input :placeholder="'value '+(index+1)" :name="'value'+index" v-model="header.value" @keyup.prevent="setRouteQueryState">
            </li>
            <div>
              <li>
                <button class="icon" @click="removeRequestHeader(index)" id="header">
                  <i class="material-icons">delete</i>
                </button>
              </li>
            </div>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="addRequestHeader">
                <i class="material-icons">add</i>
                <span>Add New</span>
              </button>
            </li>
          </ul>
        </pw-section>
      </div>
      <input id="tab-three" type="radio" name="grp">
      <label for="tab-three">Parameters</label>
      <div class="tab">
        <pw-section class="pink" label="Parameters">
          <ul>
            <li>
              <div class="flex-wrap">
                <label for="paramList">Parameter List</label>
                <div>
                  <button class="icon" @click="clearContent('parameters')">
                    <i class="material-icons">clear_all</i>
                    <span>Clear</span>
                  </button>
                </div>
              </div>
              <textarea id="paramList" readonly v-textarea-auto-height="queryString" v-model="queryString" placeholder="(add at least one parameter)" rows="1"></textarea>
            </li>
          </ul>
          <ul v-for="(param, index) in params" :key="index">
            <li>
              <input :placeholder="'parameter '+(index+1)" :name="'param'+index" v-model="param.key" autofocus>
            </li>
            <li>
              <input :placeholder="'value '+(index+1)" :name="'value'+index" v-model="param.value">
            </li>
            <div>
              <li>
                <button class="icon" @click="removeRequestParam(index)" id="param">
                  <i class="material-icons">delete</i>
                </button>
              </li>
            </div>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="addRequestParam">
                <i class="material-icons">add</i>
                <span>Add New</span>
              </button>
            </li>
          </ul>
        </pw-section>
      </div>
    </section>
    <history @useHistory="handleUseHistory" ref="historyComponent"></history>
  </div>
</template>
<script>
  import url from 'url';
  import querystring from "querystring";
  import autocomplete from '../components/autocomplete';
  import history from "../components/history";
  import section from "../components/section";
  import textareaAutoHeight from "../directives/textareaAutoHeight";
  import toggle from "../components/toggle";
  import modal from "../components/modal";
  import parseCurlCommand from '../assets/js/curlparser.js';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/dracula.css';

  const statusCategories = [{
      name: 'informational',
      statusCodeRegex: new RegExp(/[1][0-9]+/),
      className: 'info-response'
    },
    {
      name: 'successful',
      statusCodeRegex: new RegExp(/[2][0-9]+/),
      className: 'success-response'
    },
    {
      name: 'redirection',
      statusCodeRegex: new RegExp(/[3][0-9]+/),
      className: 'redir-response'
    },
    {
      name: 'client error',
      statusCodeRegex: new RegExp(/[4][0-9]+/),
      className: 'cl-error-response'
    },
    {
      name: 'server error',
      statusCodeRegex: new RegExp(/[5][0-9]+/),
      className: 'sv-error-response'
    },
    {
      // this object is a catch-all for when no other objects match and should always be last
      name: 'unknown',
      statusCodeRegex: new RegExp(/.*/),
      className: 'missing-data-response'
    }
  ];
  const parseHeaders = xhr => {
    const headers = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/);
    const headerMap = {};
    headers.forEach(line => {
      const parts = line.split(': ');
      const header = parts.shift().toLowerCase();
      const value = parts.join(': ');
      headerMap[header] = value
    });
    return headerMap

  };
  export const findStatusGroup = responseStatus => statusCategories.find(status => status.statusCodeRegex.test(
    responseStatus));

  export default {
    directives: {
      textareaAutoHeight
    },

    components: {
      'pw-section': section,
      'pw-toggle': toggle,
      'pw-modal': modal,
      history,
      autocomplete,
    },
    data() {
      return {
        label: '',
        showModal: false,
        copyButton: '<i class="material-icons">file_copy</i>',
        copiedButton: '<i class="material-icons">done</i>',
        method: 'GET',
        url: 'https://reqres.in',
        auth: 'None',
        path: '/api/users',
        httpUser: '',
        httpPassword: '',
        passwordFieldType: 'password',
        bearerToken: '',
        headers: [],
        params: [],
        bodyParams: [],
        rawParams: '',
        rawInput: false,
        contentType: 'application/json',
        requestType: 'JavaScript XHR',
        isHidden: true,
        response: {
          status: '',
          headers: '',
          body: ''
        },
        previewEnabled: false,
        paramsWatchEnabled: true,

        /**
         * These are content types that can be automatically
         * serialized by postwoman.
         */
        knownContentTypes: [
          'application/json',
          'application/x-www-form-urlencoded'
        ],

        /**
         * These are a list of Content Types known to Postwoman.
         */
        validContentTypes: [
          'application/json',
          'application/hal+json',
          'application/xml',
          'application/x-www-form-urlencoded',
          'text/html',
          'text/plain'
        ]
      }
    },
    watch: {
      contentType(val) {
        this.rawInput = !this.knownContentTypes.includes(val);
      },
      rawInput(status) {
        if (status && this.rawParams === '') this.rawParams = '{}'
        else this.setRouteQueryState()
      },
      'response.body': function (val) {
        var responseText = document.querySelector("div#response-details-wrapper pre code") != null ? document
          .querySelector("div#response-details-wrapper pre code") : null;
        if (responseText) {
          if (document.querySelector('.hljs') !== null && responseText.innerHTML.indexOf('<span class="hljs') !== -
            1) {
            responseText.removeAttribute("class");
            responseText.innerHTML = null;
            responseText.innerText = this.response.body;
          } else if (responseText && this.response.body != "(waiting to send request)" && this.response.body !=
            "Loading..." && this.response.body != "See JavaScript console (F12) for details.") {
            responseText.innerText = this.responseType == 'application/json' || 'application/hal+json' ? JSON.stringify(this.response.body,
              null, 2) : this.response.body;
            hljs.highlightBlock(document.querySelector("div#response-details-wrapper pre code"));
          } else {
            responseText.innerText = this.response.body
          }
        }
      },
      params: {
        handler: function(newValue) {
          if(!this.paramsWatchEnabled) {
            this.paramsWatchEnabled = true;
            return;
          }
          let path = this.path;
          let queryString = newValue
            .filter(({
              key
            }) => !!key)
            .map(({
              key,
              value
            }) => `${key}=${value}`).join('&')
          queryString = queryString === '' ? '' : `?${queryString}`
          if(path.includes('?')) {
            path = path.slice(0, path.indexOf('?')) + queryString;
          } else {
            path = path + queryString
          }

          this.path = path;
        },
        deep: true
      }
    },
    computed: {
      requestName() {
        return this.label
      },
      statusCategory() {
        return findStatusGroup(this.response.status);
      },
      isValidURL() {
        const protocol = '^(https?:\\/\\/)?';
        const validIP = new RegExp(protocol +
          "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$");
        const validHostname = new RegExp(protocol +
          "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$"
        );
        return validIP.test(this.url) || validHostname.test(this.url);
      },
      hasRequestBody() {
        return ['POST', 'PUT', 'PATCH'].includes(this.method);
      },
      pathName() {
        return this.path.match(/^([^?]*)\??/)[1]
      },
      rawRequestBody() {
        const {
          bodyParams
        } = this
        if (this.contentType === 'application/json') {
          try {
            const obj = JSON.parse(`{${bodyParams.filter(({key}) => !!key).map(({key, value}) => `
              "${key}": "${value}"
              `).join()}}`)
            return JSON.stringify(obj)
          } catch (ex) {
            return 'invalid'
          }
        } else {
          return bodyParams
            .filter(({
              key
            }) => !!key)
            .map(({
              key,
              value
            }) => `${key}=${encodeURIComponent(value)}`).join('&')
        }
      },
      headerString() {
        const result = this.headers
          .filter(({
            key
          }) => !!key)
          .map(({
            key,
            value
          }) => `${key}: ${value}`).join(',\n')
        return result === '' ? '' : `${result}`
      },
      queryString() {
        const result = this.params
          .filter(({
            key
          }) => !!key)
          .map(({
            key,
            value
          }) => `${key}=${encodeURIComponent(value)}`).join('&')
        return result === '' ? '' : `?${result}`
      },
      responseType() {
        return (this.response.headers['content-type'] || '').split(';')[0].toLowerCase();
      },
      requestCode() {
        if (this.requestType == 'JavaScript XHR') {
          var requestString = []
          requestString.push('const xhr = new XMLHttpRequest()');
          const user = this.auth === 'Basic' ? this.httpUser : null
          const pswd = this.auth === 'Basic' ? this.httpPassword : null
          requestString.push('xhr.open("' + this.method + '", "' + this.url + this.path + this.queryString + '", true, ' +
            user + ', ' + pswd + ')');
          if (this.auth === 'Bearer Token') {
            requestString.push("xhr.setRequestHeader('Authorization', 'Bearer ' + " + this.bearerToken + ")");
          }
          if (this.headers) {
            this.headers.forEach(function (element) {
              requestString.push('xhr.setRequestHeader(' + element.key + ', ' + element.value + ')');
            })
          }
          if (['POST', 'PUT', 'PATCH'].includes(this.method)) {
            const requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;
            requestString.push("xhr.setRequestHeader('Content-Length', " + requestBody.length + ")")
            requestString.push("xhr.setRequestHeader('Content-Type', `" + this.contentType + "; charset=utf-8`)")
            requestString.push("xhr.send(" + requestBody + ")")
          } else {
            requestString.push('xhr.send()')
          }
          return requestString.join('\n');
        } else if (this.requestType == 'Fetch') {
          var requestString = [];
          var headers = [];
          requestString.push('fetch("' + this.url + this.path + this.queryString + '", {\n')
          requestString.push('  method: "' + this.method + '",\n')
          if (this.auth === 'Basic') {
            var basic = this.httpUser + ':' + this.httpPassword;
            headers.push('    "Authorization": "Basic ' + window.btoa(unescape(encodeURIComponent(basic))) + ',\n')
          } else if (this.auth === 'Bearer Token') {
            headers.push('    "Authorization": "Bearer Token ' + this.bearerToken + ',\n')
          }
          if (['POST', 'PUT', 'PATCH'].includes(this.method)) {
            const requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;
            requestString.push('  body: ' + requestBody + ',\n')
            headers.push('    "Content-Length": ' + requestBody.length + ',\n')
            headers.push('    "Content-Type": "' + this.contentType + '; charset=utf-8",\n')
          }
          if (this.headers) {
            this.headers.forEach(function (element) {
              headers.push('    "' + element.key + '": "' + element.value + '",\n');
            })
          }
          headers = headers.join('').slice(0, -3);
          requestString.push('  headers: {\n' + headers + '\n  },\n')
          requestString.push('  credentials: "same-origin"\n')
          requestString.push(')}).then(function(response) {\n')
          requestString.push('  response.status\n')
          requestString.push('  response.statusText\n')
          requestString.push('  response.headers\n')
          requestString.push('  response.url\n\n')
          requestString.push('  return response.text()\n')
          requestString.push(')}, function(error) {\n')
          requestString.push('  error.message\n')
          requestString.push(')}')
          return requestString.join('');
        } else if (this.requestType == 'cURL') {
          var requestString = [];
          requestString.push('curl -X ' + this.method + ' \\\n')
          requestString.push("  '" + this.url + this.path + this.queryString + "' \\\n")
          if (this.auth === 'Basic') {
            var basic = this.httpUser + ':' + this.httpPassword;
            requestString.push("  -H 'Authorization: Basic " + window.btoa(unescape(encodeURIComponent(basic))) +
              "' \\\n")
          } else if (this.auth === 'Bearer Token') {
            requestString.push("  -H 'Authorization: Bearer Token " + this.bearerToken + "' \\\n")
          }
          if (this.headers) {
            this.headers.forEach(function (element) {
              requestString.push("  -H '" + element.key + ": " + element.value + "' \\\n");
            })
          }
          if (['POST', 'PUT', 'PATCH'].includes(this.method)) {
            const requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;
            requestString.push("  -H 'Content-Length: " + requestBody.length + "' \\\n")
            requestString.push("  -H 'Content-Type: " + this.contentType + "; charset=utf-8' \\\n")
            requestString.push("  -d '" + requestBody + "' \\\n")
          }
          return requestString.join('').slice(0, -3);
        }
      }
    },
    methods: {
      handleUseHistory({
        label,
        method,
        url,
        path
      }) {
        this.label = label;
        this.method = method;
        this.url = url;
        this.path = path;
        this.$refs.request.$el.scrollIntoView({
          behavior: 'smooth'
        });
      },
      async makeRequest(auth, headers, requestBody) {
        const config = this.$store.state.postwoman.settings.PROXY_ENABLED ? {
            method: 'POST',
            url: '/proxy',
            data: {
              method: this.method,
              url: this.url + this.pathName + this.queryString,
              auth,
              headers,
              data: requestBody ? requestBody.toString() : null
            }
          } : {
            method: this.method,
            url: this.url + this.pathName + this.queryString,
            auth,
            headers,
            data: requestBody ? requestBody.toString() : null
          };

        const response = await this.$axios(config);
        return this.$store.state.postwoman.settings.PROXY_ENABLED ? response.data : response;
      },
      async sendRequest() {
        if (!this.isValidURL) {
          this.$toast.error('URL is not formatted properly', {
            icon: 'error'
          });
          return;
        }

        // Start showing the loading bar as soon as possible.
        // The nuxt axios module will hide it when the request is made.
        this.$nuxt.$loading.start();

        if (this.$refs.response.$el.classList.contains('hidden')) {
          this.$refs.response.$el.classList.toggle('hidden')
        }
        this.$refs.response.$el.scrollIntoView({
          behavior: 'smooth'
        });
        this.previewEnabled = false;
        this.response.status = 'Fetching...';
        this.response.body = 'Loading...';

        const auth = this.auth === 'Basic' ? {
          username: this.httpUser,
          password: this.httpPassword
        } : null;

        let headers = {};
        let headersObject = {};

        Object.keys(headers).forEach(id => {
          headersObject[headers[id].key] = headers[id].value
        });
        headers = headersObject;

        // If the request has a body, we want to ensure Content-Length and
        // Content-Type are sent.
        let requestBody;
        if (this.hasRequestBody) {
          requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;

          Object.assign(headers, {
            //'Content-Length': requestBody.length,
            'Content-Type': `${this.contentType}; charset=utf-8`
          });
        }

        // If the request uses a token for auth, we want to make sure it's sent here.
        if (this.auth === 'Bearer Token') headers['Authorization'] = `Bearer ${this.bearerToken}`;

        headers = Object.assign(
          // Clone the app headers object first, we don't want to
          // mutate it with the request headers added by default.
          Object.assign({}, this.headers),

          // We make our temporary headers object the source so
          // that you can override the added headers if you
          // specify them.
          headers
        );

        Object.keys(headers).forEach(id => {
          headersObject[headers[id].key] = headers[id].value
        });
        headers = headersObject;

        try {
          const startTime = Date.now();

          const payload = await this.makeRequest(auth, headers, requestBody);

          const duration = Date.now() - startTime;
          this.$toast.info(`Finished in ${duration}ms`, {
            icon: 'done'
          });

          (() => {
            const status = this.response.status = payload.status;
            const headers = this.response.headers = payload.headers;

            // We don't need to bother parsing JSON, axios already handles it for us!
            const body = this.response.body = payload.data;

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
              path: this.path
            };
            this.$refs.historyComponent.addEntry(entry);
          })();
        } catch (error) {
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
              path: this.path
            };
            this.$refs.historyComponent.addEntry(entry);
            return;
          } else {
            this.response.status = error.message;
            this.response.body = "See JavaScript console (F12) for details.";
            this.$toast.error('Something went wrong!', {
              icon: 'error'
            });
            if(!this.$store.state.postwoman.settings.PROXY_ENABLED) {
              this.$toast.info('Turn on the proxy', {
                dontClose : true,
                action: {
                  text: 'Go to settings',
                  onClick : (e, toastObject) => {
                    this.$router.push({ path: '/settings' });
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
        return queryString = pathParsed.query ? pathParsed.query : '';
      },
      queryStringToArray(queryString) {
        let queryParsed = querystring.parse(queryString);
        return Object.keys(queryParsed).map((key) => ({key: key, value: queryParsed[key]}))
      },
      pathInputHandler() {
        let queryString = this.getQueryStringFromPath(),
            params = this.queryStringToArray(queryString);

        this.paramsWatchEnabled = false;
        this.params = params;
      },
      addRequestHeader() {
        this.headers.push({
          key: '',
          value: ''
        });
        return false
      },
      removeRequestHeader(index) {
        this.headers.splice(index, 1)
        this.$toast.error('Deleted', {
          icon: 'delete'
        });
      },
      addRequestParam() {
        this.params.push({
          key: '',
          value: ''
        })
        return false
      },
      removeRequestParam(index) {
        this.params.splice(index, 1)
        this.$toast.error('Deleted', {
          icon: 'delete'
        });
      },
      addRequestBodyParam() {
        this.bodyParams.push({
          key: '',
          value: ''
        })
        return false
      },
      removeRequestBodyParam(index) {
        this.bodyParams.splice(index, 1)
        this.$toast.error('Deleted', {
          icon: 'delete'
        });
      },
      formatRawParams(event) {
        if ((event.which !== 13 && event.which !== 9)) {
          return;
        }
        const textBody = event.target.value;
        const textBeforeCursor = textBody.substring(0, event.target.selectionStart);
        const textAfterCursor = textBody.substring(event.target.selectionEnd);
        if (event.which === 13) {
          event.preventDefault();
          const oldSelectionStart = event.target.selectionStart;
          const lastLine = textBeforeCursor.split('\n').slice(-1)[0];
          const rightPadding = lastLine.match(/([\s\t]*).*/)[1] || "";
          event.target.value = textBeforeCursor + '\n' + rightPadding + textAfterCursor;
          setTimeout(() => event.target.selectionStart = event.target.selectionEnd = oldSelectionStart + rightPadding
            .length + 1, 1);
        } else if (event.which === 9) {
          event.preventDefault();
          const oldSelectionStart = event.target.selectionStart;
          event.target.value = textBeforeCursor + '\xa0\xa0' + textAfterCursor;
          event.target.selectionStart = event.target.selectionEnd = oldSelectionStart + 2;
          return false;
        }
      },
      copyRequest() {
        if (navigator.share) {
          let time = new Date().toLocaleTimeString();
          let date = new Date().toLocaleDateString();
          navigator.share({
              title: `Postwoman`,
              text: `Postwoman • API request builder at ${time} on ${date}`,
              url: window.location.href
            }).then(() => {})
            .catch(console.error);
        } else {
          this.$refs.copyRequest.innerHTML = this.copiedButton + '<span>Copied</span>';
          this.$toast.success('Copied to clipboard', {
            icon: 'done'
          });
          var dummy = document.createElement('input');
          document.body.appendChild(dummy);
          dummy.value = window.location.href;
          dummy.select();
          document.execCommand('copy');
          document.body.removeChild(dummy);
          setTimeout(() => this.$refs.copyRequest.innerHTML = this.copyButton + '<span>Permalink</span>', 1000)
        }
      },
      copyRequestCode() {
        this.$refs.copyRequestCode.innerHTML = this.copiedButton + '<span>Copied</span>';
        this.$toast.success('Copied to clipboard', {
          icon: 'done'
        });
        this.$refs.generatedCode.select();
        document.execCommand("copy");
        setTimeout(() => this.$refs.copyRequestCode.innerHTML = this.copyButton + '<span>Copy</span>', 1000)
      },
      copyResponse() {
        this.$refs.copyResponse.innerHTML = this.copiedButton + '<span>Copied</span>';
        this.$toast.success('Copied to clipboard', {
          icon: 'done'
        });
        // Creates a textarea element
        var aux = document.createElement("textarea");
        var copy = this.responseType == 'application/json' ? JSON.stringify(this.response.body) : this.response.body;
        // Adds response body to the new textarea
        aux.innerText = copy;
        // Append the textarea to the body
        document.body.appendChild(aux);
        // Highlight the content
        aux.select();
        document.execCommand('copy');
        // Remove the input from the body
        document.body.removeChild(aux);
        setTimeout(() => this.$refs.copyResponse.innerHTML = this.copyButton + '<span>Copy</span>', 1000)
      },
      togglePreview() {
        this.previewEnabled = !this.previewEnabled;
        if (this.previewEnabled) {
          // If you want to add 'preview' support for other response types,
          // just add them here.
          if (this.responseType === "text/html") {
            // If the preview already has that URL loaded, let's not bother re-loading it all.
            if (this.$refs.previewFrame.getAttribute('data-previewing-url') === this.url)
              return;
            // Use DOMParser to parse document HTML.
            const previewDocument = new DOMParser().parseFromString(this.response.body, this.responseType);
            // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
            previewDocument.head.innerHTML = `<base href="${this.url}">` + previewDocument.head.innerHTML;
            // Finally, set the iframe source to the resulting HTML.
            this.$refs.previewFrame.srcdoc = previewDocument.documentElement.outerHTML;
            this.$refs.previewFrame.setAttribute('data-previewing-url', this.url);
          }
        }
      },
      setRouteQueryState() {
        const flat = key => this[key] !== '' ? `${key}=${this[key]}&` : ''
        const deep = key => {
          const haveItems = [...this[key]].length
          if (haveItems && this[key]['value'] !== '') {
            return `${key}=${JSON.stringify(this[key])}&`
          } else return ''
        }
        let flats = ['method', 'url', 'path', 'auth', 'httpUser', 'httpPassword', 'bearerToken', 'contentType'].map(
          item => flat(item))
        let deeps = ['headers', 'params'].map(item => deep(item))
        let bodyParams = this.rawInput ? [flat('rawParams')] : [deep('bodyParams')];

        this.$router.replace('/?' + flats.concat(deeps, bodyParams).join('').slice(0, -1))
      },
      setRouteQueries(queries) {
        if (typeof (queries) !== 'object') throw new Error('Route query parameters must be a Object')
        for (const key in queries) {
          if (['headers', 'params', 'bodyParams'].includes(key)) this[key] = JSON.parse(queries[key])
          if (key === 'rawParams') {
            this.rawInput = true
            this.rawParams = queries['rawParams']
          } else if (typeof (this[key]) === 'string') this[key] = queries[key]
        }
      },
      observeRequestButton() {
        const requestElement = this.$refs.request.$el;
        const sendButtonElement = this.$refs.sendButton;
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            sendButtonElement.classList.toggle('show');
          });
        }, {
          rootMargin: '0px',
          threshold: [0],
        });
        observer.observe(requestElement);
      },
      handleImport() {
        let textarea = document.getElementById("import-text")
        let text = textarea.value;
        try {
         let parsedCurl = parseCurlCommand(text);
         this.url = parsedCurl.url.replace(/"/g,"").replace(/'/g,"");
         this.url = this.url.slice(-1).pop() == '/' ? this.url.slice(0, -1): this.url;
         this.path = "";
         this.headers = [];
          for (const key of Object.keys(parsedCurl.headers)) {
            this.headers.push({
              key: key,
              value: parsedCurl.headers[key]
            })
          }
          this.method = parsedCurl.method.toUpperCase();
          if (parsedCurl["data"]){
            this.rawInput = true;
            this.rawParams = parsedCurl["data"];
          }
          this.showModal = false;
        } catch (error) {
          this.showModal = false;
          this.$toast.error('cURL is not formatted properly', {
            icon: 'error'
          });
        }
      },
      toggleModal() {
        this.showModal = !this.showModal;
      },
      switchVisibility() {
        this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password'
      },
      clearContent(name) {
        switch(name) {
          case "auth":
            this.auth = 'None';
            this.httpUser = '';
            this.httpPassword = '';
            break;
          case "headers":
            this.headers = [];
            break;
          case "parameters":
            this.params = [];
            break;
          default:
            this.label = '',
            this.method= 'GET',
            this.url = 'https://reqres.in',
            this.auth = 'None',
            this.path = '/api/users',
            this.auth = 'None';
            this.httpUser = '';
            this.httpPassword = '';
            this.headers = [];
            this.params = [];
            this.bodyParams = [];
            this.rawParams = '';
        }
        this.$toast.info('Cleared', {
          icon: 'clear_all'
        });
      }
    },
    mounted() {
      this.observeRequestButton();
    },
    created() {
      if (Object.keys(this.$route.query).length) this.setRouteQueries(this.$route.query);
      this.$watch(vm => [
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
      ], val => {
        this.setRouteQueryState()
      })
    }
  }
</script>
