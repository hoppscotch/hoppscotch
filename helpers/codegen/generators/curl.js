import Generator from "~/helpers/codegen/generators/generator"

class CurlCodegen extends Generator {
  constructor() {
    super()

    this.id = "curl"
    this.name = "cURL"
    this.joinCharacter = " \\\n"
  }

  generateMethodHeader() {
    this.requestString.push(`curl -X ${this.method}`)
  }

  generateRequestPath() {
    this.requestString.push(`  '${this.url}${this.pathName}${this.queryString}'`)
  }

  generateBasicAuthenticationHeader() {
    const basic = `${this.httpUser}:${this.httpPassword}`
    this.requestString.push(
      `  -H 'Authorization: Basic ${window.btoa(unescape(encodeURIComponent(basic)))}'`
    )
  }

  generateTokenAuthenticationHeader() {
    this.requestString.push(`  -H 'Authorization: Bearer ${this.bearerToken}'`)
  }

  generateAuthenticationHeader() {
    if (this.isBasicAuthenticationRequest) {
      this.generateBasicAuthenticationHeader()
    } else if (this.isTokenAuthenticationRequest) {
      this.generateTokenAuthenticationHeader()
    }
  }

  generateContentTypeHeader() {
    if (this.requestAllowsBody) {
      this.requestString.push(`  -H 'Content-Type: ${this.contentType}; charset=utf-8'`)
    }
  }

  generateRequestBody() {
    if (this.requestAllowsBody) {
      this.requestString.push(`  -d '${this.requestBody}'`)
    }
  }

  generateCustomRequestHeaders() {
    if (this.customRequestHeadersFound) {
      this.headers.forEach(({ key, value }) => {
        if (key) this.requestString.push(`  -H '${key}: ${value}'`)
      })
    }
  }

  populateRequestString() {
    this.generateMethodHeader()
    this.generateRequestPath()
    this.generateAuthenticationHeader()
    this.generateCustomRequestHeaders()
    this.generateContentTypeHeader()
    this.generateRequestBody()
  }
}

export default new CurlCodegen()
