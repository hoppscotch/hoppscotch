<template>
  <div class="page">
    <pw-section class="yellow" label="Import" ref="import">
      <ul>
        <li>
          <button class="icon" id="show-modal" @click="showModal = true">
            Import cURL
          </button>
        </li>
      </ul>
      <pw-modal v-if="showModal" @close="showModal = false">
        <div slot="header">
          <ul>
            <li>
              <div class="flex-wrap">
                <h3 class="title">Import cURL</h3>
                <div>
                  <button class="icon" @click="toggleModal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                      <path d="M23.954 21.03l-9.184-9.095 9.092-9.174-2.832-2.807-9.09 9.179-9.176-9.088-2.81 2.81 9.186 9.105-9.095 9.184 2.81 2.81 9.112-9.192 9.18 9.1z"/>
                    </svg>
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
                Import
              </button>
            </li>
          </ul>
        </div>
      </pw-modal>
    </pw-section>
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
          <input @keyup.enter="isValidURL ? sendRequest() : null" id="path" name="path" v-model="path">
        </li>
        <div class="show-on-small-screen">
          <li>
            <label class="hide-on-small-screen" for="copyRequest">&nbsp;</label>
            <button class="icon" @click="copyRequest" id="copyRequest" ref="copyRequest" :disabled="!isValidURL">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path d="M19.647 15.247c-1.278 0-2.429.551-3.225 1.429l-7.788-3.846c.062-.343.079-.64.067-.942l8.058-4.231c.769.682 1.78 1.097 2.889 1.097 2.404-.001 4.352-1.949 4.352-4.353s-1.948-4.353-4.353-4.353-4.353 1.949-4.353 4.353c0 .18.012.356.033.53l-7.828 4.111c-.793-.829-1.908-1.347-3.146-1.347-2.405 0-4.353 1.949-4.353 4.353s1.948 4.353 4.353 4.353c1.013 0 1.943-.347 2.684-.927l8.26 4.078-.001.047c0 2.404 1.948 4.353 4.353 4.353s4.351-1.949 4.351-4.353-1.948-4.352-4.353-4.352z"/>
              </svg>
              <span>Permalink</span>
            </button>
          </li>
          <li>
            <label class="hide-on-small-screen" for="code">&nbsp;</label>
            <button class="icon" id="code" v-on:click="isHidden = !isHidden" :disabled="!isValidURL">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="isHidden">
                <path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="!isHidden">
                <path d="M11.885 14.988l3.104-3.098.011.11c0 1.654-1.346 3-3 3l-.115-.012zm8.048-8.032l-3.274 3.268c.212.554.341 1.149.341 1.776 0 2.757-2.243 5-5 5-.631 0-1.229-.13-1.785-.344l-2.377 2.372c1.276.588 2.671.972 4.177.972 7.733 0 11.985-8.449 11.985-8.449s-1.415-2.478-4.067-4.595zm1.431-3.536l-18.619 18.58-1.382-1.422 3.455-3.447c-3.022-2.45-4.818-5.58-4.818-5.58s4.446-7.551 12.015-7.551c1.825 0 3.456.426 4.886 1.075l3.081-3.075 1.382 1.42zm-13.751 10.922l1.519-1.515c-.077-.264-.132-.538-.132-.827 0-1.654 1.346-3 3-3 .291 0 .567.055.833.134l1.518-1.515c-.704-.382-1.496-.619-2.351-.619-2.757 0-5 2.243-5 5 0 .852.235 1.641.613 2.342z"/>
              </svg>
              <span>{{ isHidden ? 'Show Code' : 'Hide Code' }}</span>
            </button>
          </li>
        </div>
        <li>
          <label class="hide-on-small-screen" for="send">&nbsp;</label>
          <button :disabled="!isValidURL" @click="sendRequest" class="show" id="send" ref="sendButton">
            Send <span id="hidden-message">Again</span>
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path d="M24 0l-6 22-8.129-7.239 7.802-8.234-10.458 7.227-7.215-1.754 24-12zm-15 16.668v7.332l3.258-4.431-3.258-2.901z"/>
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </pw-section>
    <pw-section class="blue" label="Request Code" ref="requestCode" v-if="!isHidden">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M19.647 15.247c-1.278 0-2.429.551-3.225 1.429l-7.788-3.846c.062-.343.079-.64.067-.942l8.058-4.231c.769.682 1.78 1.097 2.889 1.097 2.404-.001 4.352-1.949 4.352-4.353s-1.948-4.353-4.353-4.353-4.353 1.949-4.353 4.353c0 .18.012.356.033.53l-7.828 4.111c-.793-.829-1.908-1.347-3.146-1.347-2.405 0-4.353 1.949-4.353 4.353s1.948 4.353 4.353 4.353c1.013 0 1.943-.347 2.684-.927l8.26 4.078-.001.047c0 2.404 1.948 4.353 4.353 4.353s4.351-1.949 4.351-4.353-1.948-4.352-4.353-4.352z"/>
                </svg>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <textarea id="generatedCode" ref="generatedCode" name="generatedCode" rows="8" v-model="requestCode"></textarea>
        </li>
      </ul>
    </pw-section>
    <pw-section class="blue" label="Request Body" v-if="method === 'POST' || method === 'PUT' || method === 'PATCH'">
      <ul>
        <li>
          <autocomplete :source="validContentTypes" :spellcheck="false" v-model="contentType">Content Type
          </autocomplete>
          <span>
            <pw-toggle :on="rawInput" @change="rawInput = !rawInput">
              Raw Input {{ rawInput ? "Enabled" : "Disabled" }}
            </pw-toggle>
          </span>
        </li>
      </ul>
      <div v-if="!rawInput">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M5.633 22.031c1.135 1.313 3.735 1.969 6.334 1.969 2.601 0 5.199-.656 6.335-1.969.081-.404 3.698-18.468 3.698-18.882 0-2.473-7.338-3.149-10-3.149-4.992 0-10 1.242-10 3.144 0 .406 3.556 18.488 3.633 18.887zm6.418-16.884c-4.211 0-7.625-.746-7.625-1.667s3.414-1.667 7.625-1.667 7.624.746 7.624 1.667-3.413 1.667-7.624 1.667z"/>
                </svg>
              </button>
            </li>
          </div>
        </ul>
        <ul>
          <li>
            <button class="icon" @click="addRequestBodyParam" name="addrequest">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path d="M24 9h-9v-9h-6v9h-9v6h9v9h6v-9h9z"/>
              </svg>
              <span>Add New</span>
            </button>
          </li>
        </ul>
        <ul>
          <li>
            <label for="reqParamList">Parameter List</label>
            <textarea id="reqParamList" readonly v-textarea-auto-height="rawRequestBody" v-model="rawRequestBody" placeholder="(add at least one parameter)" rows="1"></textarea>
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
          <label for="value">{{key}}</label>
          <input id="value" :value="value" name="value" readonly>
        </li>
      </ul>
      <ul v-if="response.body">
        <li>
          <div class="flex-wrap">
            <label for="body">response</label>
            <div>
              <button class="icon" @click="copyResponse" ref="copyResponse" v-if="response.body">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M19.647 15.247c-1.278 0-2.429.551-3.225 1.429l-7.788-3.846c.062-.343.079-.64.067-.942l8.058-4.231c.769.682 1.78 1.097 2.889 1.097 2.404-.001 4.352-1.949 4.352-4.353s-1.948-4.353-4.353-4.353-4.353 1.949-4.353 4.353c0 .18.012.356.033.53l-7.828 4.111c-.793-.829-1.908-1.347-3.146-1.347-2.405 0-4.353 1.949-4.353 4.353s1.948 4.353 4.353 4.353c1.013 0 1.943-.347 2.684-.927l8.26 4.078-.001.047c0 2.404 1.948 4.353 4.353 4.353s4.351-1.949 4.351-4.353-1.948-4.352-4.353-4.352z"/>
                </svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="!previewEnabled">
                <path d="M12.015 7c4.751 0 8.063 3.012 9.504 4.636-1.401 1.837-4.713 5.364-9.504 5.364-4.42 0-7.93-3.536-9.478-5.407 1.493-1.647 4.817-4.593 9.478-4.593zm0-2c-7.569 0-12.015 6.551-12.015 6.551s4.835 7.449 12.015 7.449c7.733 0 11.985-7.449 11.985-7.449s-4.291-6.551-11.985-6.551zm-.015 5c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zm0-2c-2.209 0-4 1.792-4 4 0 2.209 1.791 4 4 4s4-1.791 4-4c0-2.208-1.791-4-4-4z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="previewEnabled">
                <path d="M19.604 2.562l-3.346 3.137c-1.27-.428-2.686-.699-4.243-.699-7.569 0-12.015 6.551-12.015 6.551s1.928 2.951 5.146 5.138l-2.911 2.909 1.414 1.414 17.37-17.035-1.415-1.415zm-6.016 5.779c-3.288-1.453-6.681 1.908-5.265 5.206l-1.726 1.707c-1.814-1.16-3.225-2.65-4.06-3.66 1.493-1.648 4.817-4.594 9.478-4.594.927 0 1.796.119 2.61.315l-1.037 1.026zm-2.883 7.431l5.09-4.993c1.017 3.111-2.003 6.067-5.09 4.993zm13.295-4.221s-4.252 7.449-11.985 7.449c-1.379 0-2.662-.291-3.851-.737l1.614-1.583c.715.193 1.458.32 2.237.32 4.791 0 8.104-3.527 9.504-5.364-.729-.822-1.956-1.99-3.587-2.952l1.489-1.46c2.982 1.9 4.579 4.327 4.579 4.327z" />
              </svg>
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
              <label for="auth">Authentication Type</label>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="passwordFieldType === 'text'">
                    <path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551zm-7 .449c0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5 5-2.243 5-5z"/>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="passwordFieldType !== 'text'">
                    <path d="M11.885 14.988l3.104-3.098.011.11c0 1.654-1.346 3-3 3l-.115-.012zm8.048-8.032l-3.274 3.268c.212.554.341 1.149.341 1.776 0 2.757-2.243 5-5 5-.631 0-1.229-.13-1.785-.344l-2.377 2.372c1.276.588 2.671.972 4.177.972 7.733 0 11.985-8.449 11.985-8.449s-1.415-2.478-4.067-4.595zm1.431-3.536l-18.619 18.58-1.382-1.422 3.455-3.447c-3.022-2.45-4.818-5.58-4.818-5.58s4.446-7.551 12.015-7.551c1.825 0 3.456.426 4.886 1.075l3.081-3.075 1.382 1.42zm-13.751 10.922l1.519-1.515c-.077-.264-.132-.538-.132-.827 0-1.654 1.346-3 3-3 .291 0 .567.055.833.134l1.518-1.515c-.704-.382-1.496-.619-2.351-.619-2.757 0-5 2.243-5 5 0 .852.235 1.641.613 2.342z"/>
                  </svg>
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
              <label for="headerList">Header List</label>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path d="M5.633 22.031c1.135 1.313 3.735 1.969 6.334 1.969 2.601 0 5.199-.656 6.335-1.969.081-.404 3.698-18.468 3.698-18.882 0-2.473-7.338-3.149-10-3.149-4.992 0-10 1.242-10 3.144 0 .406 3.556 18.488 3.633 18.887zm6.418-16.884c-4.211 0-7.625-.746-7.625-1.667s3.414-1.667 7.625-1.667 7.624.746 7.624 1.667-3.413 1.667-7.624 1.667z"/>
                  </svg>
                </button>
              </li>
            </div>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="addRequestHeader">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M24 9h-9v-9h-6v9h-9v6h9v9h6v-9h9z"/>
                </svg>
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
              <label for="paramList">Parameter List</label>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                    <path d="M5.633 22.031c1.135 1.313 3.735 1.969 6.334 1.969 2.601 0 5.199-.656 6.335-1.969.081-.404 3.698-18.468 3.698-18.882 0-2.473-7.338-3.149-10-3.149-4.992 0-10 1.242-10 3.144 0 .406 3.556 18.488 3.633 18.887zm6.418-16.884c-4.211 0-7.625-.746-7.625-1.667s3.414-1.667 7.625-1.667 7.624.746 7.624 1.667-3.413 1.667-7.624 1.667z"/>
                  </svg>
                </button>
              </li>
            </div>
          </ul>
          <ul>
            <li>
              <button class="icon" @click="addRequestParam">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M24 9h-9v-9h-6v9h-9v6h9v9h6v-9h9z"/>
                </svg>
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
        showModal: false,
        copyButton: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M19.647 15.247c-1.278 0-2.429.551-3.225 1.429l-7.788-3.846c.062-.343.079-.64.067-.942l8.058-4.231c.769.682 1.78 1.097 2.889 1.097 2.404-.001 4.352-1.949 4.352-4.353s-1.948-4.353-4.353-4.353-4.353 1.949-4.353 4.353c0 .18.012.356.033.53l-7.828 4.111c-.793-.829-1.908-1.347-3.146-1.347-2.405 0-4.353 1.949-4.353 4.353s1.948 4.353 4.353 4.353c1.013 0 1.943-.347 2.684-.927l8.26 4.078-.001.047c0 2.404 1.948 4.353 4.353 4.353s4.351-1.949 4.351-4.353-1.948-4.352-4.353-4.352z"/></svg>',
        copiedButton: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>',
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
            responseText.innerText = this.responseType == 'application/json' ? JSON.stringify(this.response.body,
              null, 2) : this.response.body;
            hljs.highlightBlock(document.querySelector("div#response-details-wrapper pre code"));
          } else {
            responseText.innerText = this.response.body
          }
        }
      }
    },
    computed: {
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
        return result == '' ? '' : `${result}`
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
          requestString.push('xhr.open(' + this.method + ', ' + this.url + this.path + this.queryString + ', true, ' +
            user + ', ' + pswd + ')');
          if (this.auth === 'Bearer Token') {
            requestString.push("xhr.setRequestHeader('Authorization', 'Bearer ' + " + this.bearerToken + ")");
          }
          if (this.headers) {
            this.headers.forEach(function (element) {
              requestString.push('xhr.setRequestHeader(' + element.key + ', ' + element.value + ')');
            })
          }
          if (this.method === 'POST' || this.method === 'PUT') {
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
          requestString.push('fetch(' + this.url + this.path + this.queryString + ', {\n')
          requestString.push('  method: "' + this.method + '",\n')
          if (this.auth === 'Basic') {
            var basic = this.httpUser + ':' + this.httpPassword;
            headers.push('    "Authorization": "Basic ' + window.btoa(unescape(encodeURIComponent(basic))) + ',\n')
          } else if (this.auth === 'Bearer Token') {
            headers.push('    "Authorization": "Bearer Token ' + this.bearerToken + ',\n')
          }
          if (this.method === 'POST' || this.method === 'PUT') {
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
          if (this.method === 'POST' || this.method === 'PUT') {
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
        method,
        url,
        path
      }) {
        this.method = method;
        this.url = url;
        this.path = path;
        this.$refs.request.$el.scrollIntoView({
          behavior: 'smooth'
        });
      },
      async sendRequest() {
        if (!this.isValidURL) {
          alert('Please check the formatting of the URL.');
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

        // If the request has a request body, we want to ensure Content-Length and
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

        try {
          const payload = await this.$axios({
            method: this.method,
            url: this.url + this.path + this.queryString,
            auth,
            headers,
            data: requestBody ? requestBody.toString() : null
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
              status: this.response.status,
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              method: this.method,
              url: this.url,
              path: this.path
            };
            this.$refs.historyComponent.addEntry(entry);
            return;
          }

          this.response.status = error.message;
          this.response.body = "See JavaScript console (F12) for details.";
        }
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
              text: `Postwoman • API request builder at ${time} on ${date}`,
              url: window.location.href
            }).then(() => {
              // console.log('Thanks for sharing!');
            })
            .catch(console.error);
        } else {
          this.$refs.copyRequest.innerHTML = this.copiedButton + '<span>Copied</span>';
          var dummy = document.createElement('input');
          document.body.appendChild(dummy);
          dummy.value = window.location.href;
          dummy.select();
          document.execCommand('copy');
          document.body.removeChild(dummy);
          setTimeout(() => this.$refs.copyRequest.innerHTML = this.copyButton + '<span>Permalink</span>', 1500)
        }
      },
      copyRequestCode() {
        this.$refs.copyRequestCode.innerHTML = this.copiedButton + '<span>Copied</span>';
        this.$refs.generatedCode.select();
        document.execCommand("copy");
        setTimeout(() => this.$refs.copyRequestCode.innerHTML = this.copyButton + '<span>Copy</span>', 1500)
      },
      copyResponse() {
        this.$refs.copyResponse.innerHTML = this.copiedButton + '<span>Copied</span>';
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
        setTimeout(() => this.$refs.copyResponse.innerHTML = this.copyButton + '<span>Copy</span>', 1500)
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
          if (key === 'headers' || key === 'params' || key === 'bodyParams') this[key] = JSON.parse(queries[key])
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
          threshold: 1
        });

        observer.observe(requestElement);
      },
      handleImport() {
        let textarea = document.getElementById("import-text")
        let text = textarea.value;
        try {
         let parsedCurl = parseCurlCommand(text);
         this.url = parsedCurl.url.replace(/"/g,"").replace(/'/g,"");
         this.url = this.url[this.url.length -1] == '/' ? this.url.slice(0, -1): this.url;
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
        }
      },
      toggleModal() {
        this.showModal = !this.showModal;
      },
      switchVisibility() {
        this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password'
      }
    },
    mounted() {
      this.observeRequestButton();
    },
    created() {
      if (Object.keys(this.$route.query).length) this.setRouteQueries(this.$route.query);
      this.$watch(vm => [
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
