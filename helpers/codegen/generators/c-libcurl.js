import Generator from "~/helpers/codegen/generators/generator"

class CLibcurlCodegen extends Generator {
  constructor() {
    super()

    this.id = "c-libcurl"
    this.name = "C libcurl"
    this.joinCharacter = "\n"
  }

  generateInitialRequest() {
    this.requestString.push("CURL *hnd = curl_easy_init();")
    this.requestString.push(`curl_easy_setopt(hnd, CURLOPT_CUSTOMREQUEST, "${this.method}");`)
    this.requestString.push(
      `curl_easy_setopt(hnd, CURLOPT_URL, "${this.url}${this.pathName}${this.queryString}");`
    )
    this.requestString.push(`struct curl_slist *headers = NULL;`)
  }

  generateCustomRequestHeaders() {
    if (this.customRequestHeadersFound) {
      this.headers.forEach(({ key, value }) => {
        if (key)
          this.requestString.push(`headers = curl_slist_append(headers, "${key}: ${value}");`)
      })
    }
  }

  generateBasicAuthenticationHeader() {
    this.requestString.push(
      `headers = curl_slist_append(headers, "Authorization: Basic ${window.btoa(
        unescape(encodeURIComponent(`${this.httpUser}:${this.httpPassword}`))
      )}");`
    )
  }

  generateTokenAuthenticationHeader() {
    this.requestString.push(
      `headers = curl_slist_append(headers, "Authorization: Bearer ${this.bearerToken}");`
    )
  }

  generateAuthenticationHeader() {
    if (this.isBasicAuthenticationRequest) {
      this.generateBasicAuthenticationHeader()
    } else if (this.isTokenAuthenticationRequest) {
      this.generateTokenAuthenticationHeader()
    }
  }

  generateContentType() {
    if (this.requestAllowsBody) {
      this.requestString.push(
        `headers = curl_slist_append(headers, "Content-Type: ${this.contentType}");`
      )
    }
  }

  generateHTTPHeader() {
    this.requestString.push("curl_easy_setopt(hnd, CURLOPT_HTTPHEADER, headers);")
  }

  generateRequestBody() {
    if (this.requestAllowsBody) {
      const requestBody = this.contentIsEncoded
        ? `"${this.requestBody}"`
        : JSON.stringify(this.requestBody)

      this.requestString.push(`curl_easy_setopt(hnd, CURLOPT_POSTFIELDS, ${requestBody});`)
    }
  }

  generateCURLEasyPerform() {
    this.requestString.push(`CURLcode ret = curl_easy_perform(hnd);`)
  }

  populateRequestString() {
    this.generateInitialRequest()
    this.generateCustomRequestHeaders()
    this.generateAuthenticationHeader()
    this.generateContentType()
    this.generateHTTPHeader()
    this.generateRequestBody()
    this.generateCURLEasyPerform()
  }
}

export default new CLibcurlCodegen()
