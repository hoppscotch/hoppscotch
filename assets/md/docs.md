{{#collections}}

# {{name}}

## {{#folders}}

## Folder: {{name}}

{{#requests}}

### {{name}}

**Method**: {{method}}

**Request URL**: `{{{url}}}{{{path}}}`

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
**RawParams**:

```json
{{{rawParams}}}
```

{{/isRawParams}}

{{#contentType}}
**ContentType**: `{{{contentType}}}`
{{/contentType}}

{{#preRequestScript}}
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

{{/preRequestScript}}

{{#testScript}}
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

{{/testScript}}

{{/requests}}

---

{{/folders}}

{{#requests}}

## {{name}}

**Method**: {{method}}

**Request URL**: `{{{url}}}{{{path}}}`

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

{{#preRequestScript}}
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

{{/preRequestScript}}

{{#testScript}}
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

{{/testScript}}

{{/requests}}

{{/collections}}

---

Made with [Hoppscotch](https://github.com/hoppscotch/hoppscotch)
