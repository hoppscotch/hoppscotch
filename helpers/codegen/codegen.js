import { CLibcurlCodegen } from "./generators/c-libcurl"
import { CsRestsharpCodegen } from "./generators/cs-restsharp"
import { CurlCodegen } from "./generators/curl"
import { GoNativeCodegen } from "./generators/go-native"
import { JavaOkhttpCodegen } from "./generators/java-okhttp"
import { JavaUnirestCodegen } from "./generators/java-unirest"
import { JavascriptFetchCodegen } from "./generators/javascript-fetch"
import { JavascriptJqueryCodegen } from "./generators/javascript-jquery"
import { JavascriptXhrCodegen } from "./generators/javascript-xhr"
import { NodejsAxiosCodegen } from "./generators/nodejs-axios"
import { NodejsNativeCodegen } from "./generators/nodejs-native"
import { NodejsRequestCodegen } from "./generators/nodejs-request"
import { PhpCurlCodegen } from "./generators/php-curl"
import { PowershellRestmethodCodegen } from "./generators/powershell-restmethod"
import { PythonHttpClientCodegen } from "./generators/python-http-client"
import { PythonRequestsCodegen } from "./generators/python-requests"
import { RubyNetHttpCodeGen } from "./generators/ruby-net-http"
import { SalesforceApexCodegen } from "./generators/salesforce-apex"
import { ShellHttpieCodegen } from "./generators/shell-httpie"
import { ShellWgetCodegen } from "./generators/shell-wget"

/* Register code generators here.
 * A code generator is defined as an object with the following structure.
 *
 * id: string
 * name: string
 * generator: (ctx) => string
 *
 */
export const codegens = [
  CLibcurlCodegen,
  CsRestsharpCodegen,
  CurlCodegen,
  GoNativeCodegen,
  JavaOkhttpCodegen,
  JavaUnirestCodegen,
  JavascriptFetchCodegen,
  JavascriptJqueryCodegen,
  JavascriptXhrCodegen,
  NodejsAxiosCodegen,
  NodejsNativeCodegen,
  NodejsRequestCodegen,
  PhpCurlCodegen,
  PowershellRestmethodCodegen,
  PythonHttpClientCodegen,
  PythonRequestsCodegen,
  RubyNetHttpCodeGen,
  SalesforceApexCodegen,
  ShellHttpieCodegen,
  ShellWgetCodegen,
]

export function generateCodeWithGenerator(codegenID, context) {
  if (codegenID) {
    const gen = codegens.find(({ id }) => id === codegenID)
    return gen ? gen.generator(context) : ""
  }

  return ""
}
