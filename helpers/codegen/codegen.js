import { JSXHRCodegen } from "./generators/js-xhr"
import { JSFetchCodegen } from "./generators/js-fetch"
import { CurlCodegen } from "./generators/curl"
import { JSAxiosCodegen } from "./generators/js-axios"
import { GoNativeCodegen } from "./generators/go-native"
import { NodeJsRequestCodegen } from "./generators/nodejs-request"
import { NodeJsNativeCodegen } from "./generators/nodejs-native"
import { JSjQueryCodegen } from "./generators/js-jQuery"
import { PowerShellRestMethod } from "./generators/powershell"
import { PhpCurlCodegen } from "./generators/php-curl"
import { PythonRequestsCodegen } from "./generators/python-requests"
import { PythonHttpClientCodegen } from "./generators/python-http-client"
import { WgetCodegen } from "./generators/wget"
import { CsRestSharpCodegen } from "./generators/cs-restsharp"
import { RubyNetHttpCodeGen } from "./generators/ruby-net-http"
import { SalesforceApexCodegen } from "./generators/salesforce-apex"
import { ShellHTTPie } from "./generators/shell-httpie"
import { JavaOkHttpClientCodegen } from "./generators/java-ok-http-client"
import { JavaUnirestCodegen } from "./generators/java-unirest"
/* Register code generators here.
 * A code generator is defined as an object with the following structure.
 *
 * id: string
 * name: string
 * generator: (ctx) => string
 *
 */
export const codegens = [
  CurlCodegen,
  CsRestSharpCodegen,
  GoNativeCodegen,
  JavaOkHttpClientCodegen,
  JavaUnirestCodegen,
  JSAxiosCodegen,
  JSFetchCodegen,
  JSjQueryCodegen,
  JSXHRCodegen,
  NodeJsRequestCodegen,
  NodeJsNativeCodegen,
  PhpCurlCodegen,
  PowerShellRestMethod,
  PythonRequestsCodegen,
  PythonHttpClientCodegen,
  RubyNetHttpCodeGen,
  SalesforceApexCodegen,
  ShellHTTPie,
  WgetCodegen,
]

export function generateCodeWithGenerator(codegenID, context) {
  if (codegenID) {
    const gen = codegens.find(({ id }) => id === codegenID)
    return gen ? gen.generator(context) : ""
  }

  return ""
}
