{{nesting_level}} {{name}}

{{#requests}}

{{nesting_level}} Request: {{name}}

**Method**: {{method}}

**Request URL**:

```
{{{url}}}{{{path}}}
```

{{#isHeaders}}
**Headers**:

<table>
<tr>
<th>Key</th>
<th>Value</th>
</tr>
{{#headers}}
<tr>
<td>{{{key}}}</td>
<td>`{{{value}}}`</td>
</tr>
{{/headers}}
</table>
{{/isHeaders}}

{{#isParams}}
**Parameters**:

<table>
<tr>
<th>type</th>
<th>Key</th>
<th>Value</th>
</tr>
{{#params}}
<tr>
<td>{{type}}</td>
<td>{{{key}}}</td>
<td>{{{value}}}</td>
</tr>
{{/params}}
</table>
{{/isParams}}

{{#isAuth}}
**Authentication Type**: {{{auth}}}
{{/isAuth}}

{{#bearerToken}}
**Bearer Token**: `{{{.}}}`
{{/bearerToken}}

{{#isAuthBasic}}
Username: `{{{httpUser}}}`
Password: `{{{httpPassword}}}`
{{/isAuthBasic}}

{{#isRawParams}}
**Raw Parameters**:

```json
{{{rawParams}}}
```

{{/isRawParams}}

{{#contentType}}
**Content Type**: `{{{contentType}}}`
{{/contentType}}

{{#isPreRequestScript}}
**Pre Request Script**:

```js
{
  {
    {
      preRequestScript
    }
  }
}
```

{{/isPreRequestScript}}

{{#isTestScript}}
**Test Script**:

```js
{
  {
    {
      testScript
    }
  }
}
```

{{/isTestScript}}

{{/requests}}

{{#folders}}

{{> folderBody }}

{{/folders}}
